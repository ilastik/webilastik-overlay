export class Shader {
    constructor(gl, source, shader_type) {
        this.gl = gl;
        this.source, source = "#version 300 es\n" + source;
        let glshader = gl.createShader(shader_type); //FIXME check this?
        gl.shaderSource(glshader, source);
        gl.compileShader(glshader);
        let success = gl.getShaderParameter(glshader, gl.COMPILE_STATUS);
        if (!success) {
            let error_log = gl.getShaderInfoLog(glshader);
            gl.deleteShader(glshader);
            throw error_log + "\n\n" + source;
        }
        this.raw = glshader;
    }
}
export class FragmentShader extends Shader {
    constructor(gl, source) {
        super(gl, source, gl.FRAGMENT_SHADER);
    }
}
export class VertexShader extends Shader {
    constructor(gl, source) {
        super(gl, source, gl.VERTEX_SHADER);
    }
}
export class AttributeLocation {
    constructor(raw) {
        this.raw = raw;
        if (raw == -1) {
            throw `Could not find GlslAttribute`;
        }
    }
}
export class ShaderProgram {
    constructor(gl, vertexShader, fragmentShader) {
        this.gl = gl;
        let program = gl.createProgram(); //FIXME check this?
        gl.attachShader(program, vertexShader.raw);
        gl.attachShader(program, fragmentShader.raw);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) {
            let error_log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw error_log;
        }
        this.glprogram = program;
        console.log(`Created program ${this.glprogram}`);
    }
    getAttribLocation(name) {
        return new AttributeLocation(this.gl.getAttribLocation(this.glprogram, name));
    }
    use() {
        if (ShaderProgram.currentProgram == this) {
            return;
        }
        this.gl.useProgram(this.glprogram);
        ShaderProgram.currentProgram = this;
    }
}
export class VertexArrayObject {
    constructor(gl) {
        this.gl = gl;
        let vao = this.gl.createVertexArray();
        if (vao === null) {
            throw `Could not create vertex GlslAttribute object`;
        }
        this.glAttributeObject = vao;
    }
    bind() {
        this.gl.bindVertexArray(this.glAttributeObject);
    }
}
//# sourceMappingURL=shader.js.map