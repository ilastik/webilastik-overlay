import { Applet, StateChangeCallback } from "../client/applets/applet";
import { FeatureExtractor } from "../client/ilastik";
import { createElement } from "../util/misc";
import { FeatureSelectionWidget } from "./widgets/feature_selection";

export class ReferencePixelClassificationWorkflowGui{
    public readonly element: HTMLElement
    public readonly feature_selection_applet: Applet<FeatureExtractor[]>

    protected constructor(
        params: {parentElement: HTMLElement, feature_selection_applet: Applet<FeatureExtractor[]>}
    ){
        this.element = createElement({tagName: "div", parentElement: params.parentElement})
        this.feature_selection_applet = params.feature_selection_applet
    }

    public static async create(
        {parentElement, session_url}: {parentElement: HTMLElement, session_url: string}
    ): Promise<ReferencePixelClassificationWorkflowGui>{
        const feature_selection_applet = await Applet.create<FeatureExtractor[]>({
            name: "feature_selection_applet",
            session_url,
            deserializer: FeatureExtractor.fromJsonList,
            widget_factory: (widget_params: {onNewState: StateChangeCallback<FeatureExtractor[]>}) => {
                return new FeatureSelectionWidget({parentElement, onNewState: widget_params.onNewState})
            }
        })
        return new ReferencePixelClassificationWorkflowGui({
            parentElement, feature_selection_applet
        })
    }
}
