import { vec3 } from "gl-matrix";
import { CreateInputParams, createElement, createInput, vecToString, InlineCss, applyInlineCss, hexColorToVec3, vec3ToHexColor } from "./utils";

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
    private readonly checkedCssOrClasses: InlineCss | string[]
    private readonly uncheckedCssOrClasses: InlineCss | string[]
    private checked: boolean
    private readonly onChange?: (new_value: boolean) => void;

    constructor({
        value,
        parentElement,
        onChange,
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
        checked=false,
    }:{
        value: string,
        parentElement: HTMLElement,
        onChange?: (checked: boolean) => void,
        checkedCssOrClasses?: InlineCss | string[],
        uncheckedCssOrClasses?: InlineCss | string[],
        checked?: boolean,
    }){
        this.onChange = onChange
        this.checkedCssOrClasses = checkedCssOrClasses
        this.uncheckedCssOrClasses = uncheckedCssOrClasses
        this.element = createElement({tagName: "span", parentElement, innerHTML: value, onClick: () => {
            this.setChecked(!this.checked);
        }})
        this.checked = this.setChecked(checked) //strictPropertyInitialization
    }

    public getChecked(): boolean{
        return this.checked
    }

    public setChecked(value: boolean): boolean{
        this.checked = value
        const styling = this.checked ? this.checkedCssOrClasses : this.uncheckedCssOrClasses
        if(styling instanceof Array){
            this.element.classList.add(...styling)
        }else{
            applyInlineCss(this.element, styling)
        }
        if(this.onChange){
            this.onChange(value)
        }
        return value
    }
}


export class Vec3ColorPicker{
    private color: vec3 = vec3.create();
    private onChange?: (new_color: vec3) => void;

    constructor({parentElement, onChange, color=vec3.fromValues(0, 1, 0), label}:{
        parentElement: HTMLElement,
        onChange?: (color: vec3) => void,
        color?: vec3,
        label?: string
    }){
        this.color = vec3.clone(color)
        this.onChange = onChange
        if(label != undefined){
            parentElement = createElement({tagName: "p", parentElement})
            createElement({tagName: "label", innerHTML: label, parentElement})
        }
        const picker = createInput({inputType: "color", parentElement, value: vec3ToHexColor(color)})
        picker.addEventListener("change", () => {this.setColor(picker.value)})
    }

    public getColor() : vec3{
        return vec3.clone(this.color)
    }

    public setColor(value: string | vec3){
        this.color = typeof value == "string" ? hexColorToVec3(value) : vec3.clone(value)
        if(this.onChange){
            this.onChange(this.color)
        }
    }
}
