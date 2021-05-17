import { Session } from "../../client/ilastik";
import { createElement, createInput } from "../../util/misc";

export class SessionLoaderWidget{
    element: HTMLElement;
    constructor({ilastik_url, parentElement, onNewSession}: {
        ilastik_url: URL,
        parentElement: HTMLElement,
        onNewSession: (session: Session) => void,
    }){
        this.element = createElement({tagName: "form", parentElement, cssClasses: ["SessionLoaderWidget"]})

        const fieldset = createElement({tagName: "fieldset", parentElement: this.element, cssClasses: ["SessionLoaderWidget"]})
        createElement({tagName: "legend", parentElement: fieldset, innerHTML: "Rejoin Session"})
        let p: HTMLElement;

        p = createElement({tagName: "p", parentElement: fieldset})
        createElement({tagName: "label", parentElement: p, innerHTML: "Session url: "})
        const session_url_field = createInput({inputType: "url", parentElement: p, required: true})

        p = createElement({tagName: "p", parentElement: fieldset})
        createElement({tagName: "label", parentElement: p, innerHTML: "Session token: "})
        const session_token_field = createInput({inputType: "text", parentElement: p, required: true})

        p = createElement({tagName: "p", parentElement: fieldset})
        const load_session_button = createInput({inputType: "submit", value: "Rejoin Session", parentElement: p})

        const message_p = createElement({tagName: "p", parentElement: fieldset})

        this.element.addEventListener("submit", (ev) => {
            load_session_button.value = "Loading Session..."
            message_p.innerHTML = ""
            load_session_button.disabled = true
            Session.load({
                ilastik_url,
                session_url: new URL(session_url_field.value.trim()),
                token: session_token_field.value.trim(),
            }).then(
                session => onNewSession(session),
                failure => {message_p.innerHTML = failure.message},
            ).then(_ => {
                load_session_button.value = "Rejoin Session"
                load_session_button.disabled = false
            })
            ev.preventDefault()
            return false
        })
    }
}
