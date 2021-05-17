import { Applet } from "../client/applets/applet";
import { FeatureExtractor, Session } from "../client/ilastik";
import { createElement, createInput } from "../util/misc";
import { FeatureSelectionWidget } from "./widgets/feature_selection";
import { SessionCreatorWidget } from "./widgets/session_creator";
import { SessionLoaderWidget } from "./widgets/session_loader";

export class IlastikLauncherWidget{
    element: HTMLElement
    session?: Session
    workflow?: ReferencePixelClassificationWorkflowGui
    constructor({parentElement, ilastik_url}: {
        parentElement: HTMLElement, ilastik_url: URL
    }){
        this.element = createElement({tagName: "fieldset", parentElement})
        createElement({tagName: "legend", parentElement: this.element, innerHTML: "Webilastik - Pixel Classification"})

        const onNewSession = (new_session: Session) => {
            this.session = new_session
            this.workflow?.element.parentElement?.removeChild(this.workflow.element)
            this.workflow = new ReferencePixelClassificationWorkflowGui({session: new_session, parentElement})
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

export class ReferencePixelClassificationWorkflowGui{
    public readonly element: HTMLElement
    public readonly feature_selection_applet: Applet<FeatureExtractor[]>
    session: Session;

    public constructor({parentElement, session}: {
        parentElement: HTMLElement,
        session: Session,
    }){
        this.session = session
        this.element = createElement({tagName: "div", parentElement})
        this.feature_selection_applet = new FeatureSelectionWidget({
            name: "feature_selection_applet",
            session,
            parentElement: this.element,
        })
    }

    public close(){
        //FIXME: close predictions and stuff
    }
}
