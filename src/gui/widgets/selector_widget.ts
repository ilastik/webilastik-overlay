import { createElement, createInput, removeElement, uuidv4 } from "../../util/misc";
import { PopupWidget } from "./popup";

export class SelectorWidget<T>{
    public readonly element: HTMLElement;
    private selection?: T
    constructor({title, options, optionRenderer, onSelection, parentElement}: {
        title: string,
        options: Array<T>,
        optionRenderer: (option: T) => string,
        onSelection: (selection?: T) => void,
        parentElement?: HTMLElement,
    }){
        let popup: PopupWidget | undefined;
        if(parentElement === undefined){
            popup = new PopupWidget(title)
            this.element = popup.element
        }else{
            popup = undefined
            this.element = createElement({tagName: "div", parentElement})
        }
        this.element.classList.add("ItkSelector")

        let form = createElement({tagName: "form", parentElement: this.element})
        options.forEach(opt => {
            const p = createElement({tagName: "p", parentElement: form})
            createInput({inputType: "radio", name: "option_selection", parentElement: p, onClick: () => {
                this.selection = opt
            }})

            const display_str = optionRenderer(opt)
            createElement({tagName: "label", parentElement: p, innerHTML: " " + display_str})
        })

        let p = createElement({tagName: "p", parentElement: form})
        createInput({inputType: "submit", value: "Ok", parentElement: p})
        createInput({inputType: "button", value: "Cancel", parentElement: p, onClick: () => {
            close(undefined)
        }})

        const close = (selection?: T) => {
            popup?.destroy()
            removeElement(this.element)
            onSelection(selection)
        }

        form.addEventListener("submit", (ev) => {
            close(this.selection)
            //don't submit synchronously
            ev.preventDefault()
            return false
        })
    }

    public static select<T>({title, options, optionRenderer, parentElement}: {
        title: string,
        options: Array<T>,
        optionRenderer: (option: T) => string,
        parentElement?: HTMLElement,
    }): Promise<T | undefined>{
        return new Promise(resolve => {
            new SelectorWidget({
                title,
                options,
                optionRenderer,
                parentElement,
                onSelection: (opt?: T) => resolve(opt)
            })
        })
    }
}


export class SimpleSelectorWidget<T>{
    public readonly element: HTMLElement;
    constructor({options, optionRenderer, onSelection, parentElement}: {
        options: Array<T>,
        optionRenderer: (option: T) => string,
        onSelection: (selection: T) => void,
        parentElement: HTMLElement,
    }){
        this.element = createElement({tagName: "form", parentElement, cssClasses: ["ItkSelector"]})
        options.forEach(opt => {
            const p = createElement({tagName: "p", parentElement: this.element})
            let radio = createInput({inputType: "radio", name: "option_selection", parentElement: p, onClick: () => {
                onSelection(opt)
            }})
            radio.id = uuidv4()
            const label =createElement({tagName: "label", parentElement: p, innerHTML: " " + optionRenderer(opt)}) as HTMLLabelElement;
            label.htmlFor = radio.id
        })
    }
}
