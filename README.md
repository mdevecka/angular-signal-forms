## Description
Signal-powered Angular Forms.
Inspired by Tim Deschryver's [ng-signal-forms](https://github.com/timdeschryver/ng-signal-forms).
Rewritten from scratch to fully utilize the power of signals.

New features:
- Every form change is now realized in terms of signals, including dynamically adding/removing validators and controls. 
  These changes in turn trigger appropriate  form and control state updates.
- Added support for nested disabled, readonly and hidden states. 
   This means that final control state is computed from it's own state and the state of it's ancestors.
- Test coverage

## Installation
```bash
npm i signal-forms
```

## Usage

### Code
```typescript
const formDisabled = signal(false);
const deliveryMethod = formControl<'email' | 'post'>('email');
const addressEnabled = formControl(true);
const streetControl = formControl('main street', { validators: [minLength(3)]);
const form = formGroup({
  name: formControl('John', { validators: [required(), minLength(3)]),
  age: formNumeric(33, { validators: [min(10)]),
  occupation: formControl<'it' | 'sales' | 'marketing' | 'education'>('it'),
  deliveryMethod: this.deliveryMethod,
  paperReceipt: formControl(true, { disabledCond: () => this.deliveryMethod.value === 'email' }),
  addressEnabled: addressEnabled,
  address: formGroup({
    street: streetControl,
    town: formControl('Hamburg', { hiddenCond: () => streetControl.value === 'hide', validators: [useValidator(required(), () => streetControl.value !== 'req')] }),
    country: formControl('Germany', { readonlyCond: () => streetControl.value === 'read' }),
  }, { disabledCond: () => !addressEnabled.value }),
  comments: formArray([
    formControl('one', { validators: [required(), minLength(3)] }),
    formControl('two', { validators: [required(), minLength(3)] }),
  ]),
}, { disabledCond: () => formDisabled() });
```

### Template
```html
<div>
  <label>Name</label>
  <input [formField]='form.controls.name' ngModel />
</div>
<div>
  <label>Age</label>
  <input [formField]='form.controls.age' ngModel />
</div>
<div>
  <label>Occupation</label>
  <select class='select' [formField]='form.controls.occupation' ngModel>
    <option value='none'>none</option>
    <option value='it'>IT</option>
    <option value='marketing'>Marketing</option>
    <option value='sales'>Sales</option>
    <option value='education'>Education</option>
  </select>
</div>
<div>
  <label>Delivery method</label>
  <input type='radio' value='email' [formField]='form.controls.deliveryMethod' ngModel>
  <label>email</label>
  <input type='radio' value='post' [formField]='form.controls.deliveryMethod' ngModel>
  <label>post</label>
</div>
<div>
  <label>Paper receipt</label>
  <input type='checkbox' [formField]='form.controls.paperReceipt' ngModel>
</div>
<fieldset>
  <legend>Address</legend>
  <label>Enabled</label>
  <input type='checkbox' [formField]='form.controls.addressEnabled' ngModel>
  <div>
    <label>Street</label>
    <input type='text' [formField]='form.controls.address.controls.street' ngModel>
  </div>
  <div [hidden]='form.controls.address.controls.town.hidden'>
    <label>Town</label>
    <input type='text' [formField]='form.controls.address.controls.town' ngModel>
  </div>
  <div>
    <label>Country</label>
    <input type='text' [formField]='form.controls.address.controls.country' ngModel>
  </div>
</fieldset>
<fieldset [class.ng-invalid]='form.controls.comments.status === "INVALID"'>
  <legend>Comments</legend>
  @for(comment of form.controls.comments.controls;track $index){
    <div>
      <input type='text' [formField]='comment' ngModel>
    </div>
  }
</fieldset>
<fieldset>
  <legend>Form state</legend>
  {{ form.status }}
</fieldset>
```

### Running Tests
```bash
npm run test
```
