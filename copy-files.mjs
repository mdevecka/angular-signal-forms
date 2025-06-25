import { copyFileSync } from 'fs';
import { basename } from 'path';

const files = ['./LICENSE', './README.md'];

for(const file of files) {
  copyFileSync(file, `./dist/angular-signal-forms/${basename(file)}`);
}
