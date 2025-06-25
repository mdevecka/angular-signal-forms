import { Directive, Injector, input, effect } from '@angular/core';
import { NgControl } from '@angular/forms';
import { FormControl } from './forms';

@Directive({
  selector: '[ngModel][formField]',
  standalone: true,
  host: {
    '[class.ng-valid]': 'this.status === "VALID"',
    '[class.ng-invalid]': 'this.status === "INVALID"',
    '[class.ng-pending]': 'this.status === "PENDING"',
    '[class.ng-pristine]': '!this.formField().dirty',
    '[class.ng-dirty]': 'this.formField().dirty',
    '[class.ng-untouched]': '!this.formField().touched',
    '[class.ng-touched]': 'this.formField().touched',
    '[attr.readonly]': '(formField().readonly) ? true : undefined',
  },
})
export class FormFieldDirective<T> {

  formField = input.required<FormControl<T>>();

  get status() { return this.formField().status; }
  get valueAccessor() { return this.control.valueAccessor!; }

  constructor(private control: NgControl, private injector: Injector) {
    // override default ngModel write behavior to fix initial display issue
    if ('_updateValue' in control) {
      control['_updateValue'] = () => null;
    }
  }

  ngOnInit() {
    this.valueAccessor.writeValue(this.formField().value);
    effect(() => {
      this.valueAccessor.writeValue(this.formField().value);
    }, { injector: this.injector });
    effect(() => {
      this.valueAccessor.setDisabledState?.(this.formField().disabled);
    }, { injector: this.injector });
    this.valueAccessor.registerOnTouched(() => {
      this.formField().touched = true;
    });
    this.valueAccessor.registerOnChange((value: any) => {
      this.formField().value = this.formField().transformValue(value);
      this.formField().dirty = true;
    });
  }

}
