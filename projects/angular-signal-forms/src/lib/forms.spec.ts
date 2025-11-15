import { TestBed, fakeAsync, tick, flush, flushMicrotasks } from '@angular/core/testing';
import { Injector, signal } from '@angular/core';
import { FormElementValidatorFn, FormControlMapper, formControl, formGroup, formArray, formNumeric } from './forms';
import { useValidator, required, minLength, min } from './validators';
import { TestComponent } from './test.component';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function testValidator(): FormElementValidatorFn<string> {
  return async (value: string) => {
    await sleep(3000);
    return (value.length < 5) ? { status: 'INVALID', errors: { min: { minLength: 5 } } } :
      { status: 'VALID' };
  };
}

export function testValidatorRaceCondition(): FormElementValidatorFn<number | undefined> {
  return async (value: number | undefined) => {
    if (value == null)
      return { status: 'VALID' };
    await sleep(value);
    return (value > 3000) ? { status: 'INVALID', errors: { error: true } } : { status: 'VALID' };
  };
}

function createForm(injector: Injector) {
  const formDisabled = signal(false);
  const deliveryMethod = formControl<'email' | 'post'>('email', { injector });
  const addressEnabled = formControl(true, { injector });
  const streetControl = formControl('main street', { validators: [minLength(3)], injector });
  const form = formGroup({
    name: formControl('John', { validators: [required(), minLength(3)], injector }),
    age: formNumeric(33, { validators: [min(10)], injector }),
    occupation: formControl('architect', { injector }),
    deliveryMethod: deliveryMethod,
    paperReceipt: formControl(true, { disabledCond: () => deliveryMethod.value === 'email', injector }),
    addressEnabled: addressEnabled,
    address: formGroup({
      street: streetControl,
      town: formControl('Hamburg', { hiddenCond: () => streetControl.value === 'aaa', validators: [useValidator(required(), () => streetControl.value !== 'bbb')], injector }),
      country: formControl('Germany', { readonlyCond: () => streetControl.value === '---', injector }),
    }, { disabledCond: () => !addressEnabled.value, injector }),
    comments: formArray([
      formControl('one', { validators: [required(), minLength(3)], injector }),
      formControl('two', { validators: [required(), minLength(3)], injector }),
    ], { injector }),
  }, { disabledCond: () => formDisabled(), injector });
  return [form, formDisabled] as const;
}

function changeInputValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new KeyboardEvent('input'));
  input.dispatchEvent(new KeyboardEvent('blur'));
}

function expectToContain<T>(arr: T[], elems: T[]) {
  for (const item of elems) {
    expect(arr).toContain(item);
  }
}

describe('forms', () => {

  it('form valid state', fakeAsync(() => {
    const injector = TestBed.inject(Injector);
    const [form] = createForm(injector);
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.name.status).toBe('VALID');
    expect(form.controls.name.errors).toEqual({});
    expect(form.controls.name.value).toBe('John');
    form.controls.name.value = '';
    flushMicrotasks();
    expect(form.status).toBe('INVALID');
    expect(form.controls.name.status).toBe('INVALID');
    expect(form.controls.name.errors).toEqual({
      required: true,
      minLength: { currentLength: 0, minLength: 3 }
    });
    form.controls.name.value = 'Ji';
    flushMicrotasks();
    expect(form.status).toBe('INVALID');
    expect(form.controls.name.status).toBe('INVALID');
    expect(form.controls.name.errors).toEqual({
      minLength: { currentLength: 2, minLength: 3 }
    });
    form.controls.name.value = 'Jin';
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.name.status).toBe('VALID');
    expect(form.controls.name.errors).toEqual({});
  }));

  it('form disabled state', fakeAsync(() => {
    const injector = TestBed.inject(Injector);
    const [form, formDisabled] = createForm(injector);
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.disabled).toBe(false);
    expect(form.controls.name.status).toBe('VALID');
    expect(form.controls.name.disabled).toBe(false);
    expect(form.controls.address.status).toBe('VALID');
    expect(form.controls.address.disabled).toBe(false);
    expect(form.controls.address.controls.street.status).toBe('VALID');
    expect(form.controls.address.controls.street.disabled).toBe(false);
    form.controls.addressEnabled.value = false;
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.disabled).toBe(false);
    expect(form.controls.name.status).toBe('VALID');
    expect(form.controls.name.disabled).toBe(false);
    expect(form.controls.address.status).toBe('DISABLED');
    expect(form.controls.address.disabled).toBe(true);
    expect(form.controls.address.controls.street.status).toBe('DISABLED');
    expect(form.controls.address.controls.street.disabled).toBe(true);
    formDisabled.set(true);
    flushMicrotasks();
    expect(form.status).toBe('DISABLED');
    expect(form.disabled).toBe(true);
    expect(form.controls.name.status).toBe('DISABLED');
    expect(form.controls.name.disabled).toBe(true);
    expect(form.controls.address.status).toBe('DISABLED');
    expect(form.controls.address.disabled).toBe(true);
    expect(form.controls.address.controls.street.status).toBe('DISABLED');
    expect(form.controls.address.controls.street.disabled).toBe(true);
    formDisabled.set(false);
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.disabled).toBe(false);
    expect(form.controls.name.status).toBe('VALID');
    expect(form.controls.name.disabled).toBe(false);
    expect(form.controls.address.status).toBe('DISABLED');
    expect(form.controls.address.disabled).toBe(true);
    expect(form.controls.address.controls.street.status).toBe('DISABLED');
    expect(form.controls.address.controls.street.disabled).toBe(true);
  }));

  it('form async validation', fakeAsync(() => {
    const injector = TestBed.inject(Injector);
    const [form] = createForm(injector);
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.name.status).toBe('VALID');
    form.controls.name.addValidator(testValidator());
    flushMicrotasks();
    expect(form.status).toBe('PENDING');
    expect(form.controls.name.status).toBe('PENDING');
    tick(1000);
    expect(form.status).toBe('PENDING');
    expect(form.controls.name.status).toBe('PENDING');
    tick(3000);
    expect(form.status).toBe('INVALID');
    expect(form.controls.name.status).toBe('INVALID');
    form.controls.name.value = 'Peter';
    flushMicrotasks();
    expect(form.status).toBe('PENDING');
    expect(form.controls.name.status).toBe('PENDING');
    tick(4000);
    expect(form.status).toBe('VALID');
    expect(form.controls.name.status).toBe('VALID');
    form.controls.name.value = 'Eva';
    flushMicrotasks();
    tick(4000);
    expect(form.status).toBe('INVALID');
    expect(form.controls.name.status).toBe('INVALID');
    form.controls.name.removeValidator(form.controls.name.validators.at(-1));
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.name.status).toBe('VALID');
  }));

  it('form async validation race condition', fakeAsync(() => {
    const injector = TestBed.inject(Injector);
    const [form] = createForm(injector);
    flushMicrotasks();
    form.controls.age.addValidator(testValidatorRaceCondition());
    form.controls.age.value = 1000;
    tick(1000);
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.age.status).toBe('VALID');
    form.controls.age.value = 5000;
    tick(1000);
    expect(form.status).toBe('PENDING');
    expect(form.controls.age.status).toBe('PENDING');
    flushMicrotasks();
    form.controls.age.value = 2000;
    tick(3000);
    expect(form.status).toBe('VALID');
    expect(form.controls.age.status).toBe('VALID');
    flushMicrotasks();
    tick(2000);
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.age.status).toBe('VALID');
  }));

  it('form add/remove control', fakeAsync(() => {
    const injector = TestBed.inject(Injector);
    const [form] = createForm(injector);
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.comments.status).toBe('VALID');
    form.controls.comments.addControl(formControl('', { validators: [required()], injector }));
    flushMicrotasks();
    expect(form.status).toBe('INVALID');
    expect(form.controls.comments.status).toBe('INVALID');
    form.controls.comments.controls.at(-1)!.value = 'ok';
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.comments.status).toBe('VALID');
    form.controls.comments.controls.at(-2)!.value = '-';
    flushMicrotasks();
    expect(form.status).toBe('INVALID');
    expect(form.controls.comments.status).toBe('INVALID');
    form.controls.comments.removeControl(form.controls.comments.controls.at(-2));
    flushMicrotasks();
    expect(form.status).toBe('VALID');
    expect(form.controls.comments.status).toBe('VALID');
  }));

  it('form field directive', fakeAsync(() => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(TestComponent);
    const comp = fixture.componentInstance;
    const elem = fixture.nativeElement;
    const formModel = comp.formModel;
    const nameControl = formModel.controls.name;
    const [nameInput] = elem.querySelectorAll('input');
    fixture.detectChanges();
    flush();
    expect(nameInput.value).toBe('Laura');
    expectToContain(nameInput.classList, ['ng-valid', 'ng-untouched', 'ng-pristine']);
    changeInputValue(nameInput, 'Liam');
    fixture.detectChanges();
    expectToContain(nameInput.classList, ['ng-valid', 'ng-touched', 'ng-dirty']);
    expect(nameControl.value).toBe('Liam');
    expect(nameControl.touched).toBe(true);
    expect(nameControl.dirty).toBe(true);
    expect(nameControl.status).toBe('VALID');
    expect(nameControl.errors).toEqual({});
    changeInputValue(nameInput, '');
    fixture.detectChanges();
    expectToContain(nameInput.classList, ['ng-invalid', 'ng-touched', 'ng-dirty']);
    expect(nameControl.value).toBe('');
    expect(nameControl.touched).toBe(true);
    expect(nameControl.dirty).toBe(true);
    expect(nameControl.status).toBe('INVALID');
    expect(nameControl.errors).toEqual({
      required: true,
      minLength: { currentLength: 0, minLength: 3 },
    });
    nameControl.value = 'Sandra';
    fixture.detectChanges();
    expect(nameInput.value).toBe('Sandra');
    expectToContain(nameInput.classList, ['ng-valid', 'ng-touched', 'ng-dirty']);
    formModel.clearState();
    fixture.detectChanges();
    expect(nameInput.value).toBe('Sandra');
    expectToContain(nameInput.classList, ['ng-valid', 'ng-untouched', 'ng-pristine']);
  }));

  it('form field numeric value transform', fakeAsync(() => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(TestComponent);
    const comp = fixture.componentInstance;
    const elem = fixture.nativeElement;
    const formModel = comp.formModel;
    const ageControl = formModel.controls.age;
    const [, ageInput] = elem.querySelectorAll('input');
    fixture.detectChanges();
    flush();
    expect(ageInput.value).toBe('22');
    changeInputValue(ageInput, '40');
    fixture.detectChanges();
    expect(ageControl.value).toBe(40);
    expect(ageControl.status).toBe('VALID');
    expect(ageControl.errors).toEqual({});
    changeInputValue(ageInput, '');
    fixture.detectChanges();
    expect(ageControl.value).toBe(undefined);
    expect(ageControl.status).toBe('INVALID');
    expect(ageControl.errors).toEqual({
      min: { value: undefined, minValue: 10 }
    });
    ageControl.value = 28;
    fixture.detectChanges();
    expect(ageInput.value).toBe('28');
    expectToContain(ageInput.classList, ['ng-valid', 'ng-touched', 'ng-dirty']);
  }));

  it('form value get/set', fakeAsync(() => {
    const injector = TestBed.inject(Injector);
    const [form] = createForm(injector);
    flushMicrotasks();
    const initialValue: FormControlMapper<typeof form> = {
      name: 'John',
      age: 33,
      occupation: 'architect',
      deliveryMethod: 'email',
      paperReceipt: true,
      addressEnabled: true,
      address: {
        street: 'main street',
        town: 'Hamburg',
        country: 'Germany'
      },
      comments: ['one', 'two']
    };
    expect(form.value).toEqual(initialValue);
    const newValue: FormControlMapper<typeof form> = {
      name: 'John',
      age: 34,
      occupation: 'architect',
      deliveryMethod: 'email',
      paperReceipt: true,
      addressEnabled: true,
      address: {
        street: 'second street',
        town: 'Berlin',
        country: 'Germany'
      },
      comments: ['1', '2']
    };
    form.value = newValue;
    flushMicrotasks();
    expect(form.value).not.toEqual(initialValue);
    expect(form.value).toEqual(newValue);
  }));

});
