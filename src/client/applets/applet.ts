import { Jsonable, IDeserializer, toJsonValue } from "../../util/serialization";

export interface IAppletWidget<STATE extends Jsonable>{
    displayState: (state: STATE) => void;
}
export type StateChangeCallback<STATE extends Jsonable> = (state: STATE) => void;
export type IWidgetFactory<STATE extends Jsonable> = (params: {onNewState: StateChangeCallback<STATE>}) => IAppletWidget<STATE>

/////////////////////////

export class Applet<STATE extends Jsonable>{
    public readonly name: string
    public readonly socket: WebSocket
    public readonly deserializer: IDeserializer<STATE>
    public readonly widget?: IAppletWidget<STATE>

    public constructor({name, socket, deserializer, widget_factory}: {
        name: string,
        socket: WebSocket,
        deserializer: IDeserializer<STATE>,
        widget_factory?: IWidgetFactory<STATE>
    }){
        this.name = name
        this.socket = socket
        this.deserializer = deserializer
        this.widget = widget_factory ? widget_factory({onNewState: (state) => this.updateState(state)}) : undefined

        socket.addEventListener('message', (event) => {
            let payload = JSON.parse(event.data)
            if("applet_name" in payload && payload["applet_name"] == this.name){
                console.debug(`+++>>> Applet ${this.name} got message ${JSON.stringify(payload, null, 4)}`)
                const new_state: STATE = this.deserializer(payload)
                this.widget?.displayState(new_state)
            }
        })
    }

    private updateState(new_state: STATE){
        const args = toJsonValue(new_state)
        console.debug(`>>>>>> ${this.name} is updating state to ${JSON.stringify(args, null, 4)}`)
        this.socket.send(JSON.stringify({
            "applet_name": this.name,
            "method_name": "set_state",
            "args": args
        }))
    }
}
