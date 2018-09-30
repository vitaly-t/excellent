////////////////////////////////////
// Excellent.js v1.6.1 declarations
////////////////////////////////////

declare namespace ERoot {

    type BindingProcess = boolean | (() => void);
    type ModulesNamespace = { readonly [name: string]: any };
    type ServicesNamespace = { readonly [name: string]: any };

    // Controller-Implementing function or class:
    type ControllerImpl = ((ctrl: EController) => void) | (new(name: string, node: ControlledElement) => EController);

    // Type API:
    // https://vitaly-t.github.io/excellent/ControlledElement.html
    interface ControlledElement extends HTMLElement {
        readonly controllers: { readonly [name: string]: EController };
    }

    // Type API:
    // https://vitaly-t.github.io/excellent/EController.html
    class EController {
        constructor(name: string, node: ControlledElement);

        readonly name: string;
        readonly node: ControlledElement;

        bind(process?: BindingProcess): void

        depends(ctrlNames: string[]): void

        extend(ctrlName: string, local?: boolean): EController

        extend(ctrlNames: string[], local?: boolean): EController[]

        find(ctrlName: string): EController[]

        findOne(ctrlName: string): EController

        onInit(): void

        onReady(): void

        onDestroy(): void
    }

    // Type API:
    // https://vitaly-t.github.io/excellent/ERoot.html
    interface ERoot<SN = ServicesNamespace> {
        readonly version: string;
        readonly modules: ModulesNamespace;
        readonly services: SN;

        addController(name: string, func: ControllerImpl): boolean

        addAlias(name: string, ctrlNames: string | string[], cb?: (...ctrl: EController[]) => void): void

        addModule(name: string, func: (scope: { [name: string]: any }) => void): boolean

        addService(name: string, func: (scope: { [name: string]: any }) => void): boolean

        attach(e: Element, ctrlName: string): EController

        attach(e: Element, ctrlNames: string[]): EController[]

        bind(process?: BindingProcess): void

        bindFor(e: Element, process?: BindingProcess): void

        find(ctrlName: string): EController[]

        findOne(ctrlName: string): EController

        getCtrlFunc(name: string, noError?: boolean): ControllerImpl | null

        analyze(): EStatistics

        reset(): void

        onReady(): void
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
        modules: ModulesNamespace
        services: ServicesNamespace
    }
}

export = ERoot;
