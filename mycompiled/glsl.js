export class GlslType {
    constructor(GlslName, elementType, numElements, binaryArrayFactory) {
        this.GlslName = GlslName;
        this.elementType = elementType;
        this.numElements = numElements;
        this.binaryArrayFactory = binaryArrayFactory;
    }
}
GlslType.vec4 = new GlslType("vec4", "FLOAT", 4, Float32Array);
GlslType.vec3 = new GlslType("vec3", "FLOAT", 3, Float32Array);
GlslType.vec2 = new GlslType("vec2", "FLOAT", 2, Float32Array);
export class GlslUniform {
    constructor(gl, name) {
        this.gl = gl;
        this.name = name;
    }
    set(value, program) {
        program.use();
        var location = this.gl.getUniformLocation(program.glprogram, this.name);
        if (location === null) {
            throw `Could not find uniform named ${this.name}`;
        }
        this.doSet(value);
    }
}
export class GlslUniformMat4 extends GlslUniform {
    doSet(value) {
        this.gl.uniformMatrix4fv(location, false, value);
    }
    toCode() {
        return `uniform mat4 ${this.name};\n`;
    }
}
export class GlslAttribute {
    constructor(gl, GlslType, name) {
        this.gl = gl;
        this.GlslType = GlslType;
        this.name = name;
    }
    toCode() {
        return `in ${this.GlslType.GlslName} ${this.name};\n`;
    }
    enable({ program, buffer, normalize, byteOffset = 0 }) {
        let location = program.getAttribLocation(this.name);
        this.gl.enableVertexAttribArray(location.raw);
        buffer.bindAs("ARRAY_BUFFER");
        this.gl.vertexAttribPointer(
        /*index=*/ location.raw, 
        /*size=*/ this.GlslType.numElements, 
        /*type=*/ this.gl[this.GlslType.elementType], 
        /*normalize=*/ normalize, 
        /*stride=*/ 0, 
        /*offset=*/ byteOffset);
        buffer.unbind();
    }
}
export class Buffer {
    constructor(gl, name, data, usageHint) {
        this.gl = gl;
        this.name = name;
        let buf = gl.createBuffer();
        if (buf === null) {
            throw `Could not create buffer`;
        }
        this.glbuffer = buf;
        this.populate(data, usageHint);
    }
    destroy() {
        this.gl.deleteBuffer(this.glbuffer);
    }
    get bindTarget() {
        return this.target;
    }
    bindAs(target) {
        let previouslyBound = Buffer.bindings.get(target);
        if (previouslyBound !== undefined) {
            throw `Buffer ${previouslyBound} was still bound to ${target} when binding ${this.name}`;
        }
        this.gl.bindBuffer(this.gl[target], this.glbuffer);
        this.target = target;
        Buffer.bindings.set(target, this.name);
    }
    unbind() {
        if (this.target === undefined) {
            throw `Trying to unbind unbound vuffer ${this.name}`;
        }
        this.gl.bindBuffer(this.gl[this.target], null);
        Buffer.bindings.delete(this.target);
        this.target = undefined;
    }
    populate(data, usageHint) {
        this.bindAs("ARRAY_BUFFER");
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl[usageHint]);
        this.unbind();
        this.numElements = data.length;
    }
}
Buffer.bindings = new Map();
//# sourceMappingURL=glsl.js.map