import { vec3, mat4 } from "gl-matrix";

export function project(out: vec3, v: vec3, onto: vec3){
    // a . b = |a| * |b| * cos(alpha)
    // if |b| == 1 -> a . b = |a| * cos(alpha) = projection_length
    vec3.normalize(out, onto)
    let projection_length = vec3.dot(v, out)
    vec3.scale(out, out, projection_length)
    return out
}

export function project_onto_plane(out: vec3, v: vec3, plane_ortho: vec3): vec3{
    let v_parallel_planeOrtho = out; project(v_parallel_planeOrtho, v, plane_ortho)
    vec3.sub(out, v, v_parallel_planeOrtho)
    return out
}

export function manualLookAt(out: mat4, eye: vec3, center: vec3, up: vec3): mat4{
    let cameraZ_w = vec3.create(); vec3.sub(cameraZ_w, center, eye); vec3.normalize(cameraZ_w, cameraZ_w); vec3.negate(cameraZ_w, cameraZ_w)
    let cameraY_w = vec3.create(); project_onto_plane(cameraY_w, up, cameraZ_w)
    let cameraX_w = vec3.create(); vec3.cross(cameraX_w, cameraY_w, cameraZ_w); vec3.normalize(cameraX_w, cameraX_w)

    var cam_to_world = mat4.fromValues( //column major
        cameraX_w[0], cameraX_w[1], cameraX_w[2], 0,
        cameraY_w[0], cameraY_w[1], cameraY_w[2], 0,
        cameraZ_w[0], cameraZ_w[1], cameraZ_w[2], 0,
                   0,            0,            0, 1,
    )

    mat4.invert(out, cam_to_world) // out = cam_to_world ^ -1 = world_to_cam
    return out
}

// type KnownKeys<T> = {
//     [K in keyof T]: string extends K ? never : number extends K ? never : K
// } extends { [_ in keyof T]: infer U } ? U : never;

export type InlineCss = Partial<Omit<
    CSSStyleDeclaration,
    "getPropertyPriority" | "getPropertyValue" | "item" | "removeProperty" | "setProperty"
>>

export interface CreateElementParams{
    tagName:string,
    parentElement:HTMLElement,
    innerHTML?:string,
    cssClasses?:Array<string>,
    inlineCss?: InlineCss,
    onClick?: (event: MouseEvent) => void,
}


export interface CreateInputParams extends Omit<CreateElementParams, "tagName">{
    inputType: string,
    parentElement:HTMLElement,
    value?:string,
    name?:string,
    disabled?:boolean,
}

export function createElement({tagName, parentElement, innerHTML, cssClasses, inlineCss={}, onClick}: CreateElementParams): HTMLElement{
    const element = document.createElement(tagName);
    parentElement.appendChild(element)
    if(innerHTML !== undefined){
        element.innerHTML = innerHTML
    }
    (cssClasses || []).forEach(klass => {
        element.classList.add(klass)
    })
    if(onClick !== undefined){
        element.addEventListener('click', onClick)
    }
    applyInlineCss(element, inlineCss)
    return element
}

export function applyInlineCss(element: HTMLElement, inlineCss: InlineCss){
    for(let key in inlineCss){ //FIXME: remove any
        (element.style as any)[key] = inlineCss[key]
    }
}

export function insertAfter({reference, new_element}: {reference: HTMLElement, new_element: HTMLElement}){
    if(!reference.parentNode){
        throw `Element ${reference} has no parent node!`
    }
    let parent = reference.parentNode
    let found = false
    for(let child of parent.children){
        if(found){
            parent.insertBefore(new_element, child)
            return
        }
        if(child == reference){
            found = true
        }
    }
    //refenrece was the last child
    parent.appendChild(new_element)
}

export function createImage({src, parentElement, cssClasses, onClick}:
    {src:string, parentElement:HTMLElement, cssClasses?:Array<string>, onClick?: (event: MouseEvent) => void}
): HTMLImageElement{
    const image = <HTMLImageElement>createElement({tagName: 'img', cssClasses, parentElement, onClick});
    image.src = src
    return image
}


export function createInput(params : CreateInputParams): HTMLInputElement{
    const input = <HTMLInputElement>createElement({tagName:'input', ...params})
    input.type = params.inputType;
    if(params.value !== undefined){
        input.value = params.value
    }
    if(params.name !== undefined){
        input.name = params.name
    }
    input.disabled = params.disabled ? true : false
    return input
}

export function createSelect({parentElement, values, name, onClick}:
    {parentElement:HTMLElement, values?: Map<string, string>, name?:string, onClick?: (event: MouseEvent) => void}
): HTMLSelectElement{
    const select = <HTMLSelectElement>createElement({tagName: 'select', parentElement})
    if(values !== undefined){
        values.forEach((displayValue:string, value:string) => {
            let option = <HTMLInputElement>createElement({tagName: 'option', innerHTML: displayValue, parentElement: select, onClick})
            option.value = value
        })
    }
    if(name !== undefined){
        select.name = name
    }
    return select
}

export function createOption({displayText, value, parentElement}:
    {displayText:string, value:string, parentElement:HTMLElement}
): HTMLOptionElement{
    let option = <HTMLOptionElement>createElement({tagName: 'option', parentElement, innerHTML: displayText})
    option.value = value
    return option
}


export function getElementContentRect(element: HTMLElement){
    let clientRect = element.getBoundingClientRect() //with border and padding

    let paddingLeft = parseInt(element.style.paddingLeft) || 0
    let paddingTop = parseInt(element.style.paddingTop) || 0
    let paddingRight = parseInt(element.style.paddingRight) || 0
    let paddingBottom = parseInt(element.style.paddingBottom) || 0

    let borderLeft = parseInt(element.style.borderLeft) || 0
    let borderTop = parseInt(element.style.borderTop) || 0
    let borderRight = parseInt(element.style.borderRight) || 0
    let borderBottom = parseInt(element.style.borderBottom) || 0

    return {
        width:  clientRect.width  - borderLeft - paddingLeft - paddingRight - borderRight,
        height: clientRect.height - borderTop - paddingTop - paddingBottom - borderBottom,
        left:   clientRect.left   + paddingLeft + borderLeft,
        top:    clientRect.top    + paddingTop + borderTop
    }
}

//FIXME: this assumes overlay has no padding or border
export function coverContents({target, overlay}: {target: HTMLElement, overlay: HTMLElement}){
    let targetContentRect = getElementContentRect(target);
    overlay.style.position = "fixed"
    overlay.style.width =  targetContentRect.width  + "px"
    overlay.style.height = targetContentRect.height + "px"
    overlay.style.top =    targetContentRect.top    + "px"
    overlay.style.left =   targetContentRect.left   + "px"
}



export function vec3ToRgb(value: vec3): string{
    return "rgb(" + value.map((c: number) => Math.floor(c * 255)).join(", ") + ")"
}

export function vecToString(value: Float32Array | Array<number>): string{
    let axisNames = "xyzw";
    return Array.from(value).map((value, idx) => {
        const value_str = value >= 0 ? " " + value.toFixed(3) : value.toFixed(3);
        return axisNames[idx] + ": " + value_str
    }).join(", ")
}

function float_to_s(num: number){
    let base = "      "
    let out = num.toFixed(3)
    let leading_zeros =  base.slice(0, base.length - out.length)
    return leading_zeros + out
}

export function m4_to_s(m: mat4) : string{
    let columns = [
      m.slice(0,  4),
      m.slice(4,  8),
      m.slice(8,  12),
      m.slice(12,  16)
    ]

    let lines = []
    for(var line_idx of [0,1,2,3]){
        let line = []
        for(var col of columns){
            line.push(float_to_s(col[line_idx]))
        }
        lines.push(line)
    }
    let comma_sep_lines = lines.map((line) => line.join(", "))
    return comma_sep_lines.join("\n")
}

export function hexColorToVec3(color: string): vec3{
    let channels = color.slice(1).match(/../g)!.map(c => parseInt(c, 16) / 255)
    return vec3.fromValues(channels[0], channels[1], channels[2])
}

export function vec3ToHexColor(color: vec3): string{
    return "#" + Array.from(color).map((val) => {
        const val_str = Math.round(val * 255).toString(16)
        return val_str.length < 2 ? "0" + val_str : val_str
    }).join("")
}
