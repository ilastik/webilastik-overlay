import { BrushingOverlay } from './brushing_overlay'
import {createElement} from './utils'

let container = createElement({tagName: "div", parentElement: document.body})
container.style.width = "400px"
container.style.height = "300px"
container.style.border = "solid 5px purple"

new BrushingOverlay({target: container})
