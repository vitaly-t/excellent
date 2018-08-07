interface ControlledElement extends Element {
    readonly controllers: EController[];
}

type BindingProcess = boolean | (() => void);

interface EController {
    readonly name: string;
    readonly node: ControlledElement;

    bind(process?: BindingProcess): void

    depends(ctrlNames: string[]): void

    extend(ctrlName: string | string[]): EController | EController[]

    find(ctrlName: string): EController[]

    findOne(ctrlName: string): EController

    onInit: () => any
    onDestroy: () => any
}

interface ERoot {
    version: string;

    services: object;

    addController(name: string, cb: (ctrl: EController) => void)

    addModule(name: string, cb: (self: object) => void)

    addService(name: string, cb: (self: object) => void)

    bind(process?: BindingProcess): void

    find(ctrlName: string): EController[]

    findOne(ctrlName: string): EController

    onInit: () => any
}

declare var excellent: ERoot;
