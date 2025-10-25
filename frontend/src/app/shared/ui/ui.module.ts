import { NgModule } from '@angular/core';

/**
 * Wrapper module reserved for third-party UI components (Zard UI).
 * Actual imports will be added as components are pulled in during later phases.
 */
@NgModule({
  exports: []
})
export class UiModule {}
