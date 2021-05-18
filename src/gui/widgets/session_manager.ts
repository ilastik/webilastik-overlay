import { IViewerDriver } from "../..";
import { Session } from "../../client/ilastik";
import { createElement, createInput } from "../../util/misc";
import { ReferencePixelClassificationWorkflowGui } from "../reference_pixel_classification_workflow";
import { SessionCreatorWidget } from "./session_creator";
import { SessionLoaderWidget } from "./session_loader";

export class SessionManagerWidget{
    element: HTMLElement
    session?: Session
    workflow?: ReferencePixelClassificationWorkflowGui
    constructor({parentElement, ilastik_url, viewer_driver}: {
        parentElement: HTMLElement, ilastik_url?: URL, viewer_driver: IViewerDriver
    }){
        this.element = createElement({tagName: "div", parentElement, cssClasses: ["IlastikLauncherWidget"]})

        const onNewSession = (new_session: Session) => {
            this.session = new_session
            this.workflow?.element.parentElement?.removeChild(this.workflow.element)
            this.workflow = new ReferencePixelClassificationWorkflowGui({
                session: new_session, parentElement, viewer_driver
            })
            close_session_btn.disabled = false
        }
        new SessionCreatorWidget({parentElement: this.element, ilastik_url, onNewSession})
        new SessionLoaderWidget({parentElement: this.element, ilastik_url, onNewSession})

        const close_session_btn = createInput({
            inputType: "button",
            value: "Close Session",
            parentElement: this.element,
            onClick: async () => {
                this.session?.close()
                close_session_btn.disabled = true
            },
            inlineCss: {
                marginTop: "10px",
            }
        })
        close_session_btn.disabled = true
    }
}
