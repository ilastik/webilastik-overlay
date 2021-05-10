import { websocket_connect } from "../../util/misc";
import { Jsonable, IDeserializer, toJsonValue } from "../../util/serialization";

export type StateChangeCallback<STATE extends Jsonable> = (state: STATE) => void;
export interface IAppletWidget<STATE extends Jsonable>{
    displayState: (state: STATE) => void;
}
export interface IWidgetFactory<STATE extends Jsonable>{
    (params: {onNewState: StateChangeCallback<STATE>}): IAppletWidget<STATE>
}

/////////////////////////

export class Applet<STATE extends Jsonable>{
    public readonly name: string
    public readonly socket: WebSocket
    public readonly deserializer: IDeserializer<STATE>
    public readonly widget?: IAppletWidget<STATE>

    public constructor(params: {
        name: string,
        socket: WebSocket,
        deserializer: IDeserializer<STATE>,
        widget_factory?: IWidgetFactory<STATE>,
    }){
        this.name = params.name
        this.socket = params.socket
        this.deserializer = params.deserializer
        if(params.widget_factory){
            this.widget = params.widget_factory({
                onNewState: (state) => this.updateUpstreamState(state)
            })
            this.socket.addEventListener("message", (ev: MessageEvent) => {
                let raw_data = JSON.parse(ev.data)
                let new_state = this.deserializer(raw_data)
                this.widget?.displayState(new_state)
            })
        }
    }

    public static async create<STATE extends Jsonable>(params: {
        session_url: string,
        name: string,
        deserializer: IDeserializer<STATE>,
        widget_factory?: IWidgetFactory<STATE>
    }): Promise<Applet<STATE>>{
        let socket = await websocket_connect(params.session_url.replace(/\/$/, "") + "/ws/" + params.name)
        return new Applet<STATE>({
            name: params.name,
            socket: socket,
            deserializer: params.deserializer,
            widget_factory: params.widget_factory,
        })
    }

    private updateUpstreamState(new_state: STATE){
        const args = toJsonValue(new_state)
        console.debug(`>>>>>> ${this.name} is updating state to ${JSON.stringify(args, null, 4)}`)
        this.socket.send(JSON.stringify(toJsonValue(new_state)))
    }
}
