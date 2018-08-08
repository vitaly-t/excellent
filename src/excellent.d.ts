//////////////////////////////////////////////////////////////////////////////
// Complete Excellent.js 0.5.5 declaration
//
// TODO: May need some export tweaking to make it import-able for client-side.
//////////////////////////////////////////////////////////////////////////////

type BindingProcess = boolean | (() => void);

// Type API:
// https://vitaly-t.github.io/excellent/ControlledElement.html
interface ControlledElement extends Element {
    readonly controllers: { readonly [name: string]: EController };
}

// Type API:
// https://vitaly-t.github.io/excellent/EController.html
interface EController {
    readonly name: string;
    readonly node: ControlledElement;

    bind(process?: BindingProcess): void

    depends(ctrlNames: string[]): void

    extend(ctrlName: string | string[]): EController | EController[]

    find(ctrlName: string): EController[]

    findOne(ctrlName: string): EController

    onInit: () => void
    onDestroy: () => void
}

// Type API:
// https://vitaly-t.github.io/excellent/ERoot.html
interface ERoot {
    readonly version: string;
    readonly services: { readonly [name: string]: any };

    addController(name: string, cb: (ctrl: EController) => void)

    addModule(name: string, cb: (scope: { [name: string]: any }) => void)

    addService(name: string, cb: (scope: { [name: string]: any }) => void)

    bind(process?: BindingProcess): void

    find(ctrlName: string): EController[]

    findOne(ctrlName: string): EController

    onInit: () => void
}

declare const excellent: ERoot;
