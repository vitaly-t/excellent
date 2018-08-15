////////////////////////////////////////////
// Complete Excellent.js 0.9.0 declarations
////////////////////////////////////////////

declare namespace ERoot {

    type BindingProcess = boolean | (() => void);
    type ServicesNamespace = { readonly [name: string]: any };

    // Type API:
    // https://vitaly-t.github.io/excellent/ControlledElement.html
    interface ControlledElement extends HTMLElement {
        readonly controllers: { readonly [name: string]: EController };
    }

    // Type API:
    // https://vitaly-t.github.io/excellent/EController.html
    interface EController {
        readonly name: string;
        readonly node: ControlledElement;

        bind(process?: BindingProcess): void

        depends(ctrlNames: string[]): void

        extend(ctrlName: string | string[], local?: boolean): EController | EController[]

        find(ctrlName: string): EController[]

        findOne(ctrlName: string): EController

        onInit: () => void
        onReady: () => void
        onDestroy: () => void
    }

    // Type API:
    // https://vitaly-t.github.io/excellent/ERoot.html
    interface ERoot<SN = ServicesNamespace> {
        readonly version: string;
        readonly services: SN;

        addController(name: string, cb: (ctrl: EController) => void)

        addModule(name: string, cb: (scope: { [name: string]: any }) => void)

        addService(name: string, cb: (scope: { [name: string]: any }) => void)

        bind(process?: BindingProcess): void

        find(ctrlName: string): EController[]

        findOne(ctrlName: string): EController

        analyze(): EStatistics

        onInit: () => void
    }

    // Type API:
    // https://vitaly-t.github.io/excellent/EStatistics.html
    interface EStatistics {
        bindings: {
            locals: number
            callbacks: number
            waiting: boolean
            global: boolean
        };
        controllers: {
            global: { [name: string]: EController[] }
            local: { [name: string]: EController[] }
            registered: string[],
            total: number
        };
        elements: ControlledElement[]
        modules: { [name: string]: any }
        services: { [name: string]: any }
    }
}

export = ERoot;
