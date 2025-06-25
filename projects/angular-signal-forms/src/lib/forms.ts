import { Injector, VERSION, signal, computed, effect } from '@angular/core';
import { Observable } from 'rxjs';

const effectOpts = (parseInt(VERSION.major) < 19) ? { allowSignalWrites: true } : undefined;

export interface FormErrors {
  [errorType: string]: any;
}

export type FormElementStatus = 'VALID' | 'INVALID' | 'PENDING' | 'DISABLED' | 'READONLY' | 'HIDDEN';
export type ValidationResult = { status: 'VALID' } | { status: 'INVALID', errors: FormErrors };
export type ValidationState = { status: 'VALID' } | { status: 'PENDING' } | { status: 'INVALID', errors: FormErrors };

export type FormElement = FormControl<any> | FormGroup<any> | FormArray<any>;

export interface FormElementValidatorFn<T> {
  (value?: T): ValidationResult | Promise<ValidationResult> | Observable<ValidationResult>;
}

export interface FormElementOptions<T> {
  disabledCond?: () => boolean;
  readonlyCond?: () => boolean;
  hiddenCond?: () => boolean;
  validators?: FormElementValidatorFn<T>[];
  injector?: Injector;
}

export interface FormControlOptions<T> extends FormElementOptions<T> {
  valueTransformer?: (value: string) => T | undefined;
}

export abstract class BaseFormElement<T> {

  private lastControls: BaseFormElement<any>[] = [];

  private parentSignal = signal<BaseFormElement<any> | null>(null);
  private validatorsSignal = signal<FormElementValidatorFn<T>[]>(this.opt?.validators ?? []);

  protected get childControls(): BaseFormElement<any>[] { return []; }
  protected abstract get validatorInput(): T | undefined;

  private childrenTouched = computed(() => this.childControls.some(c => c.touched));
  private childrenDirty = computed(() => this.childControls.some(c => c.dirty));
  private childrenStatus = computed<FormElementStatus>(() => {
    const controls = this.childControls;
    let hasPending = false;
    for (const control of controls) {
      if (control.status === 'INVALID')
        return 'INVALID';
      hasPending ||= (control.status === 'PENDING');
    }
    return (hasPending) ? 'PENDING' : 'VALID';
  });

  private validatorResults = computed(() =>
    this.validatorsSignal().map(() => signal<ValidationState>({ status: 'VALID' }))
  );
  private errorsSignal = computed<FormErrors>(() => {
    if (this.disabled || this.readonly || this.hidden)
      return [];
    const results = this.validatorResults();
    let errors = {};
    for (const res of results) {
      const resValue = res();
      if (resValue.status === 'INVALID') {
        errors = { ...errors, ...resValue.errors };
      }
    }
    return errors;
  });
  private statusSignal = computed<FormElementStatus>(() => {
    if (this.disabled)
      return 'DISABLED';
    if (this.readonly)
      return 'READONLY';
    if (this.hidden)
      return 'HIDDEN';
    const results = this.validatorResults();
    const childrenStatus = this.childrenStatus();
    if (childrenStatus === 'INVALID')
      return 'INVALID';
    let hasPending = (childrenStatus === 'PENDING');
    for (const res of results) {
      const status = res().status;
      if (status === 'PENDING') {
        hasPending = true;
        continue;
      }
      if (status !== 'VALID')
        return 'INVALID';
    }
    return (hasPending) ? 'PENDING' : 'VALID';
  });

  private validationEffect = effect(() => {
    const validators = this.validatorsSignal();
    const results = this.validatorResults();
    const value = this.validatorInput;
    const disabled = this.disabled;
    const readonly = this.readonly;
    const hidden = this.hidden;
    for (let i = 0; i < validators.length; i++) {
      const validator = validators[i];
      const result = results[i];
      const res = (disabled || readonly || hidden) ? { status: 'VALID' as const } : validator(value);
      if (res instanceof Promise) {
        result.set({ status: 'PENDING' });
        res.then(value => result.set(value));
      } else if (res instanceof Observable) {
        res.subscribe(value => result.set(value));
      } else {
        result.set(res);
      }
    }
  }, { ...effectOpts, injector: this.opt?.injector });
  private setParentEffect = effect(() => {
    const controls = this.childControls;
    for (const control of this.lastControls) {
      if (!controls.includes(control)) {
        control.parent = null;
      }
    }
    for (const control of controls) {
      if (!this.lastControls.includes(control)) {
        control.parent = this;
      }
    }
    this.lastControls = controls;
  }, { ...effectOpts, injector: this.opt?.injector });

  get touched(): boolean { return this.childrenTouched(); }
  get dirty(): boolean { return this.childrenDirty(); }
  get disabled(): boolean { return (this.opt?.disabledCond != null && this.opt.disabledCond()) || (this.parent != null && this.parent.disabled); }
  get readonly(): boolean { return (this.opt?.readonlyCond != null && this.opt.readonlyCond()) || (this.parent != null && this.parent.readonly); }
  get hidden(): boolean { return (this.opt?.hiddenCond != null && this.opt.hiddenCond()) || (this.parent != null && this.parent.hidden); }
  get validators() { return this.validatorsSignal(); }
  get status(): FormElementStatus { return this.statusSignal(); }
  get errors() { return this.errorsSignal(); }
  get parent() { return this.parentSignal(); }

  protected set parent(value: BaseFormElement<any> | null) {
    this.parentSignal.set(value);
  }

  constructor(protected opt?: FormElementOptions<T>) {
  }

  addValidator(validator: FormElementValidatorFn<T>) {
    this.validatorsSignal.update(validators => [...validators, validator]);
  }

  removeValidator(validator: FormElementValidatorFn<T> | undefined) {
    this.validatorsSignal.update(validators => validators.filter(v => v !== validator));
  }

  controlAction(action: (control: FormControl<T>) => void) {
    for (const child of this.childControls) {
      child.controlAction(action);
    }
  }

  clearState() {
    this.controlAction((control) => {
      control.touched = false;
      control.dirty = false;
    });
  }

}

export class FormControl<T> extends BaseFormElement<T> {

  private valueSignal = signal<T | undefined>(this.initValue);
  private touchedSignal = signal(false);
  private dirtySignal = signal(false);

  protected get validatorInput() { return this.valueSignal(); }

  get value() { return this.valueSignal(); }
  override get touched() { return this.touchedSignal(); }
  override get dirty() { return this.dirtySignal(); }

  set value(value: T | undefined) {
    this.valueSignal.set(value);
  }

  override set touched(value: boolean) {
    this.touchedSignal.set(value);
  }

  override set dirty(value: boolean) {
    this.dirtySignal.set(value);
  }

  constructor(private initValue: T, protected override opt?: FormControlOptions<NoInfer<T>>) {
    super(opt);
  }

  transformValue(value: string) {
    return (this.opt?.valueTransformer != null) ? this.opt.valueTransformer(value) : value as T;
  }

  override controlAction(action: (control: FormControl<T>) => void) {
    action(this);
  }

}

export class FormGroup<T extends { [K in keyof T]: BaseFormElement<any> }> extends BaseFormElement<T> {

  private controlsSignal = signal<T>({} as any);
  private controlArray = computed<BaseFormElement<any>[]>(() => Object.values(this.controlsSignal()));

  protected override get childControls(): BaseFormElement<any>[] { return this.controlArray(); }
  protected get validatorInput() { return this.controlsSignal(); }

  get controls() { return this.controlsSignal(); }

  set controls(value: T) {
    this.controlsSignal.set(value);
  }

}

export class FormArray<T extends BaseFormElement<any>> extends BaseFormElement<T[]> {

  private controlsSignal = signal<T[]>([]);

  protected override get childControls(): BaseFormElement<any>[] { return this.controlsSignal(); }
  protected get validatorInput() { return this.controlsSignal(); }

  get controls() { return this.controlsSignal(); }

  set controls(value: T[]) {
    this.controlsSignal.set(value);
  }

  updateControls(func: (controls: T[]) => T[]) {
    this.controlsSignal.update(func);
  }

  addControl(control: T) {
    this.updateControls(controls => [...controls, control]);
  }

  removeControl(control: T | undefined) {
    this.updateControls(controls => controls.filter(c => c !== control));
  }

}

export function formControl<T>(value: T, opt?: FormControlOptions<NoInfer<T>>) {
  return new FormControl(value, opt);
}

export function formNumeric(value: number, opt?: FormControlOptions<number>): FormControl<number> {
  return new FormControl(value, { ...opt, valueTransformer: (value) => parseInt(value) || undefined });
}

export function formGroup<T extends { [K in keyof T]: FormElement }>(controls: T, opt?: FormElementOptions<NoInfer<T>>): FormGroup<T> {
  const group = new FormGroup<T>(opt);
  group.controls = controls;
  return group;
}

export function formArray<T extends FormElement>(controls: T[], opt?: FormElementOptions<NoInfer<T>[]>): FormArray<T> {
  const array = new FormArray<T>(opt);
  array.controls = controls;
  return array;
}
