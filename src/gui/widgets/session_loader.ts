import { Session } from "../../client/ilastik";
import { createElement, createInput } from "../../util/misc";

export class SessionLoaderWidget{
    element: HTMLElement;
    constructor({ilastik_url=new URL("https://web.ilastik.org/app"), parentElement, onNewSession}: {
        ilastik_url?: URL,
        parentElement: HTMLElement,
        onNewSession: (session: Session) => void,
    }){
        this.element = createElement({tagName: "div", parentElement, cssClasses: ["SessionLoaderWidget"]})
        createElement({tagName: "h2", parentElement: this.element, innerHTML: "Rejoin Session"})

        const form = createElement({tagName: "form", parentElement: this.element})
        let p: HTMLElement;

        p = createElement({tagName: "p", parentElement: form})
        createElement({tagName: "label", innerHTML: "Ilastik api URL: ", parentElement: p})
        const url_input = createInput({inputType: "url", parentElement: p, required: true, value: ilastik_url.toString()})

        p = createElement({tagName: "p", parentElement: form})
        createElement({tagName: "label", parentElement: p, innerHTML: "Session url: "})
        const session_url_field = createInput({inputType: "url", parentElement: p, required: true})

        p = createElement({tagName: "p", parentElement: form})
        createElement({tagName: "label", parentElement: p, innerHTML: "Session token: "})
        const session_token_field = createInput({inputType: "text", parentElement: p, required: true})

        p = createElement({tagName: "p", parentElement: form})
        const load_session_button = createInput({inputType: "submit", value: "Rejoin Session", parentElement: p})

        const message_p = createElement({tagName: "p", parentElement: form})

        form.addEventListener("submit", (ev) => {
            load_session_button.value = "Loading Session..."
            message_p.innerHTML = ""
            load_session_button.disabled = true
            Session.load({
                ilastik_url: new URL(url_input.value),
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
