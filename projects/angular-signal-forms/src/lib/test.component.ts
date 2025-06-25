import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formControl, formGroup, formNumeric } from './forms';
import { FormFieldDirective } from './form-field.directive';
import { required, minLength, min } from './validators';

@Component({
  selector: 'test',
  standalone: true,
  imports: [FormsModule, FormFieldDirective],
  template: `
    <input type='text' [formField]='formModel.controls.name' ngModel>
    <input type='text' [formField]='formModel.controls.age' ngModel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestComponent {

  formModel = formGroup({
    name: formControl('Laura', { validators: [required(), minLength(3)] }),
    age: formNumeric(22, { validators: [min(10)] }),
  });

}
