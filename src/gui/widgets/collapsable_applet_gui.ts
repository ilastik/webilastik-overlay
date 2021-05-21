import { createElement, createInput } from "../../util/misc";

export class CollapsableWidget{
    public readonly element: HTMLElement;
    public constructor({display_name, parentElement}:{display_name: string, parentElement: HTMLElement}){
        this.element = createElement({tagName: "div", parentElement, cssClasses: ["CollapsableApplet"]})
        const header = createElement({tagName: "h2", parentElement: this.element, innerHTML: display_name})
        const collapse_button = createInput({
            inputType: "button",
            parentElement: header,
            value: "-",
            inlineCss: {float: "right"},
            onClick: () => {
                const collapsing = collapse_button.value == "-"
                collapse_button.value = collapsing ? "□" : "-"
                this.element.querySelectorAll("*").forEach(element => {
                    if(!(element instanceof HTMLElement)){
                        console.error("Found bad element in applet:")
                        console.error(element)
                        return
                    }
                    if(element != header && element != collapse_button){
                        if(collapsing){
                            element.classList.add("itk_hidden_element")
                        }else{
                            element.classList.remove("itk_hidden_element")
                        }
                    }
                })
            }
        })
    }
}
