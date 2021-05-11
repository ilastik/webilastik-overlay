import { Applet, StateChangeCallback } from "../client/applets/applet";
import { FeatureExtractor } from "../client/ilastik";
import { PixelClassificationSession } from "../client/workflows/pixel_classification";
import { createElement, createInput } from "../util/misc";
import { FeatureSelectionWidget } from "./widgets/feature_selection";

export class IlastikLauncherWidget{
    element: HTMLElement
    button: HTMLInputElement;
    session?: PixelClassificationSession
    workflow?: ReferencePixelClassificationWorkflowGui
    constructor(parentElement: HTMLElement, ilastik_url: URL){
        let start_button_label = "Start ilastik"
        let starting_session_button_label = "Starting Session... ⌛"
        let stop_session = async () => {
            this.session?.close()
            this.button.value = start_button_label
            this.button.removeEventListener("click", stop_session)
        }
        let start_session = async () => {
            this.button.value = starting_session_button_label
            this.button.disabled = true
            try{

                this.session = await PixelClassificationSession.create({
                    ctor: PixelClassificationSession,
                    ilastik_url,
                    retries: 20,
                    session_duration_seconds: 60,
                })
                this.workflow = await ReferencePixelClassificationWorkflowGui.create({session: this.session, parentElement})
                this.button.value = "Close Session"
                this.button.removeEventListener("click", start_session)
                this.button.addEventListener("click", stop_session)
            }catch{
                this.button.value = starting_session_button_label
            }finally{
                this.button.disabled = false
            }
        }
        this.element = createElement({tagName: "div", parentElement})
        createElement({tagName: "h1", innerHTML: "ilastik", parentElement})
        this.button = createInput({inputType: "button", value: start_button_label, parentElement: this.element, onClick: start_session})
    }
}

export class ReferencePixelClassificationWorkflowGui{
    public readonly element: HTMLElement
    public readonly feature_selection_applet: Applet<FeatureExtractor[]>
    session: PixelClassificationSession;

    public constructor({parentElement, session, feature_selection_applet}: {
        parentElement: HTMLElement,
        session: PixelClassificationSession,
        feature_selection_applet: Applet<FeatureExtractor[]>,
    }){
        this.session = session
        this.element = createElement({tagName: "div", parentElement})
        this.feature_selection_applet = feature_selection_applet
    }

    public static async create({session, parentElement}: {
        session: PixelClassificationSession, parentElement: HTMLElement
    }): Promise<ReferencePixelClassificationWorkflowGui>{
        const feature_selection_applet = await Applet.create<FeatureExtractor[]>({
            name: "feature_selection_applet",
            session,
            deserializer: FeatureExtractor.fromJsonList,
            widget_factory: (widget_params: {onNewState: StateChangeCallback<FeatureExtractor[]>}) => {
                return new FeatureSelectionWidget({parentElement, onNewState: widget_params.onNewState})
            }
        })
        return new ReferencePixelClassificationWorkflowGui({
            parentElement, session, feature_selection_applet
        })
    }
}
