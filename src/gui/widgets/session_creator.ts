import { Session } from "../../client/ilastik"
import { createElement, createInput } from "../../util/misc"

export class SessionCreatorWidget{
    element: HTMLElement
    constructor({parentElement, ilastik_url, onNewSession}:{
        parentElement: HTMLElement,
        ilastik_url: URL,
        onNewSession: (new_session: Session) => void,
    }){
        this.element = createElement({tagName: "form", parentElement, cssClasses: ["SessionCreatorWidget"]})

        const fieldset = createElement({tagName: "fieldset", parentElement: this.element, cssClasses: ["SessionCreatorWidget"]})
        createElement({tagName: "legend", parentElement: fieldset, innerHTML: "Create New Session"})

        let p = createElement({tagName: "p", parentElement: fieldset})
        createElement({tagName: "label", innerHTML: "Timeout (minutes): ", parentElement: p})
        const timeout_input = createInput({inputType: "number", parentElement: p, required: true, value: "5"})
        timeout_input.min = "1"

        p = createElement({tagName: "p", parentElement: fieldset})
        createElement({tagName: "label", innerHTML: "Session Duration (minutes): ", parentElement: p})
        const duration_input = createInput({inputType: "number", parentElement: p, required: true, value: "5"})
        duration_input.min = "5"

        p = createElement({tagName: "p", parentElement: fieldset})
        const create_session_btn = createInput({inputType: "submit", value: "Create", parentElement: p})

        const status_messages = createElement({tagName: "div", parentElement: fieldset, inlineCss: {
            maxHeight: "6em",
            overflowY: "scroll",
            backgroundColor: "rgba(0, 0, 0, 10%)"
        }})

        this.element.addEventListener("submit", (ev) => {
            create_session_btn.value = "Creating Session..."
            create_session_btn.disabled = true
            status_messages.innerHTML = ""
            Session.create({
                ilastik_url,
                timeout_s: parseInt(timeout_input.value) * 60,
                session_duration_seconds: parseInt(duration_input.value) * 60,
                onProgress: (message) => {
                    status_messages.innerHTML += `<p>${new Date().toLocaleString()} ${message}</p>`
                    status_messages.scrollTop = status_messages.scrollHeight
                }
            }).then(
                session => onNewSession(session),
                failure => {
                    status_messages.innerHTML = failure.message
                }
            ).then(_ => {
                create_session_btn.value = "Create"
                create_session_btn.disabled = false
            })
            //don't submit synchronously
            ev.preventDefault()
            return false
        })

    }
}
