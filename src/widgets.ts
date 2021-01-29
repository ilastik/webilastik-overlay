import { CreateInputParams, createElement, createInput, vecToString, InlineCss, applyInlineCss } from "./utils";

export class VecDisplayWidget{
    public readonly element: HTMLElement;
    private readonly inputElement : HTMLInputElement
    private _value?: Float32Array | Array<number>
    constructor(params: {
        label?: string,
        value?: Float32Array
    } & Omit<CreateInputParams, "value" | "inputType" | "disabled">){
        this.element = createElement({
            tagName: "p", ...params, cssClasses: (params.cssClasses || []).concat(["VecDisplayWidget"])
        })
        if(params.label){
            createElement({tagName: "label", innerHTML: params.label, parentElement: this.element, cssClasses: ["VecDisplayWidget_input"]})
        }
        this.inputElement = createInput({inputType: "text", parentElement: this.element, disabled: true})
        if(params.value){
            this.value = params.value
        }
    }

    public set value(val: Float32Array | Array<number> | undefined){
        this._value = val ? new Float32Array(val) : undefined;
        this.inputElement.value = val ? vecToString(val) : ""
    }

    public get value(): Float32Array | Array<number> | undefined {
        return this._value ? new Float32Array(this._value) : undefined
    }
}

export class ToggleButton{
    public readonly element: HTMLElement
    private _checked = false

    public get checked(): boolean{
        return this._checked
    }

    public set checked(value: boolean){
        this._checked = value
    }
    constructor({
        value,
        parentElement,
        onClick,
        checkedCssOrClasses={
            borderStyle: "inset",
            backgroundColor: "rgba(0,0,0, 0.1)",
            userSelect: "none",
        },
        uncheckedCssOrClasses={
            borderStyle: "outset",
            backgroundColor: "rgba(0,0,0, 0.0)",
            userSelect: "none",
        },
    }:{
        value: string,
        parentElement: HTMLElement,
        checkedCssOrClasses?: InlineCss | string[],
        uncheckedCssOrClasses?: InlineCss | string[],
        onClick?: (checked: boolean) => void
    }){
        const updateStyle = () => {
            const styling = this.checked ? checkedCssOrClasses : uncheckedCssOrClasses
            if(styling instanceof Array){
                this.element.classList.add(...styling)
            }else{
                applyInlineCss(this.element, styling)
            }
        }
        this.element = createElement({tagName: "span", parentElement, innerHTML: value, onClick: () => {
            this.checked = !this.checked;
            updateStyle()
            if(onClick){
                onClick(this.checked)
            }
        }})
        updateStyle()
    }
}
