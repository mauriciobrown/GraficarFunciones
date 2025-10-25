// ==============================
// CONFIGURACIÓN GLOBAL
// ==============================

const segmentosCurva = 100;
const segmentosRadial = 60;
const ejeLength = 7;

let viewStates = {
    graph2D: { scene: null, camera: null, renderer: null, controls: null, mesh: null, labels: [] },
    graph3DX: { scene: null, camera: null, renderer: null, controls: null, meshes: [], labels: [] },
    graph3DY: { scene: null, camera: null, renderer: null, controls: null, meshes: [], labels: [] }
};

// ==============================
// UTILIDADES DE CÁLCULO
// ==============================

function getLimits() {
    const defaultA = -1;
    const defaultB = 3;
    const decimalSeparator = (1.1).toLocaleString().substring(1, 2);

    function parseLocalizedNumber(input) {
        if (typeof input !== 'string') return NaN;
        let normalized = input.trim();
        normalized = decimalSeparator === ',' ? normalized.replace(',', '.') : normalized.replace(',', '.');
        return parseFloat(normalized);
    }

    let a = parseLocalizedNumber(document.getElementById('limiteA').value);
    let b = parseLocalizedNumber(document.getElementById('limiteB').value);
    let A = isNaN(a) ? defaultA : a;
    let B = isNaN(b) ? defaultB : b;
    if (A > B) [A, B] = [B, A];
    return { A, B };
}

function evaluateFunction(formula, x) {
    try {
        const parsed = formula.replace(/,/g, '.');
        return math.evaluate(parsed, { x });
    } catch (e) {
        console.error("Error al evaluar:", formula, "x =", x, e);
        return 0;
    }
}

// ==============================
// INICIALIZACIÓN DE VISTAS
// ==============================

function initView(id, container, is3D = true) {
    const state = viewStates[id];
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xf0f0f0);

    const aspectRatio = container.clientWidth / container.clientHeight;
    const frustumSize = 18;

    if (is3D) {
        state.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
        state.camera.position.set(1, 5, 12);
        state.camera.lookAt(0, 0, 0);
    } else {
        state.camera = new THREE.OrthographicCamera(
            frustumSize * aspectRatio / -2, frustumSize * aspectRatio / 2,
            frustumSize / 2, frustumSize / -2,
            0.1, 1000
        );
        state.camera.position.set(0, 0, 15);
    }

    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(state.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 3);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    state.scene.add(ambientLight, directionalLight);

    createCustomAxes(id, state.scene, is3D);

    state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    if (!is3D) {
        state.controls.enableRotate = false;
        state.controls.enableZoom = true;
        state.controls.enablePan = true;
    }

    animateView(id);
}

function animateView(id) {
    const state = viewStates[id];
    if (!state.renderer) return;
    requestAnimationFrame(() => animateView(id));
    state.controls?.update();
    updateAxisLabels(id);
    state.renderer.render(state.scene, state.camera);
}

// ==============================
// EJES Y ETIQUETAS
// ==============================

function addAxisLabel(viewId, letter, colorClass, position) {
    const container = document.getElementById('wrapper' + viewId.slice(5));
    if (!container) return;
    const labelDiv = document.createElement('div');
    labelDiv.className = `label ${colorClass}`;
    labelDiv.textContent = letter;
    container.appendChild(labelDiv);
    viewStates[viewId].labels.push({ element: labelDiv, position });
}

function updateAxisLabels(viewId) {
    const state = viewStates[viewId];
    if (!state.renderer || !state.labels.length) return;

    const canvas = state.renderer.domElement;
    const canvasRect = canvas.getBoundingClientRect();
    const wrapper = document.getElementById('wrapper' + viewId.slice(5));
    const wrapperRect = wrapper.getBoundingClientRect();

    for (let { element, position } of state.labels) {
        const vector = position.clone().project(state.camera);
        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * canvas.clientHeight;
        element.style.left = `${canvasRect.left - wrapperRect.left + x}px`;
        element.style.top = `${canvasRect.top - wrapperRect.top + y}px`;
        element.style.transform = `translate(-50%, -50%)`;
    }
}

function createCustomAxes(viewId, scene, is3D) {
    viewStates[viewId].labels.forEach(l => l.element.remove());
    viewStates[viewId].labels = [];

    const axisMaterialBlack = new THREE.LineBasicMaterial({ color: 0x000000 });

    const ejeX = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-ejeLength, 0, 0), new THREE.Vector3(ejeLength, 0, 0)]),
        axisMaterialBlack
    );
    scene.add(ejeX);
    addAxisLabel(viewId, 'X', 'x', new THREE.Vector3(ejeLength + 0.5, 0, 0));

    const ejeXLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-ejeLength, 0, 0), new THREE.Vector3(ejeLength, 0, 0)]),
        new THREE.LineDashedMaterial({ color: 0xff0000, dashSize: 0.2, gapSize: 0.1 })
    );
    ejeXLine.computeLineDistances();
    scene.add(ejeXLine);

    const ejeY = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -ejeLength, 0), new THREE.Vector3(0, ejeLength, 0)]),
        axisMaterialBlack
    );
    scene.add(ejeY);
    addAxisLabel(viewId, 'Y', 'y', new THREE.Vector3(0, ejeLength + 0.5, 0));

    if (is3D) {
        const ejeZ = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -ejeLength), new THREE.Vector3(0, 0, ejeLength)]),
            axisMaterialBlack
        );
        scene.add(ejeZ);
        addAxisLabel(viewId, 'Z', 'z', new THREE.Vector3(0, 0, ejeLength + 0.5));

        const coneGeometry = new THREE.ConeGeometry(0.3, 0.5, 32);
        const cones = [
            { pos: [ejeLength, 0, 0], rot: [0, 0, -Math.PI / 2], color: 0xff0000 },
            { pos: [0, ejeLength, 0], rot: [0, 0, 0], color: 0x00ff00 },
            { pos: [0, 0, ejeLength], rot: [Math.PI / 2, 0, 0], color: 0x0000ff }
        ];
        cones.forEach(({ pos, rot, color }) => {
            const cone = new THREE.Mesh(coneGeometry, new THREE.MeshPhongMaterial({ color }));
            cone.position.set(...pos);
            cone.rotation.set(...rot);
            scene.add(cone);
        });
    }
}

// ==============================
// GENERADORES DE GRÁFICOS
// ==============================

function generarCurva2D(formula) {
    const { A, B } = getLimits();
    const state = viewStates.graph2D;
    if (!state.scene) return;
    if (state.mesh) {
        state.scene.remove(state.mesh);
        state.mesh.geometry?.dispose();
        state.mesh.material?.dispose();
        state.mesh = null;
    }

    const points = [];
    const step = (B - A) / segmentosCurva;
    for (let i = 0; i <= segmentosCurva; i++) {
        const x = A + i * step;
               const y = evaluateFunction(formula, x);
        points.push(new THREE.Vector3(x, y, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xFF6600, linewidth: 5 });
    state.mesh = new THREE.Line(geometry, material);
    state.scene.add(state.mesh);
}

function generarCurvas2D(formulas) {
    const { A, B } = getLimits();
    const state = viewStates.graph2D;
    if (!state.scene) return;

    if (state.mesh) {
        state.scene.remove(state.mesh);
        state.mesh.geometry?.dispose();
        state.mesh.material?.dispose();
        state.mesh = null;
    }

    const group = new THREE.Group();
    const colors = [0xFF6600, 0x007bff, 0x28a745, 0x6f42c1];
    let curvasGraficadas = 0;

    formulas.forEach((formula, index) => {
        const parsed = formula.replace(/,/g, '.');
        const points = [];
        const step = (B - A) / segmentosCurva;

        for (let i = 0; i <= segmentosCurva; i++) {
            const x = A + i * step;
            const y = evaluateFunction(parsed, x);
            if (!isNaN(y)) {
                points.push(new THREE.Vector3(x, y, 0));
            }
        }

        if (points.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: colors[index % colors.length],
                linewidth: 4
            });
            const line = new THREE.Line(geometry, material);
            group.add(line);
            curvasGraficadas++;
        }
    });

    if (curvasGraficadas > 0) {
        state.mesh = group;
        state.scene.add(group);
    } else {
        console.warn("No se pudo graficar ninguna función válida.");
    }
}

function generarSolidoX(formula, color = 0x007bff) {
    const { A, B } = getLimits();
    const state = viewStates.graph3DX;
    if (!state.scene || !formula.trim()) return;

    const profilePoints = [];
    const step = (B - A) / segmentosRadial;

    for (let i = 0; i <= segmentosRadial; i++) {
        const x = A + i * step;
        const y = evaluateFunction(formula, x);
        if (!isNaN(y) && y >= 0) {
            profilePoints.push(new THREE.Vector2(Math.abs(y), x));
        }
    }

    if (profilePoints.length < 2) return;

    const geometry = new THREE.LatheGeometry(profilePoints, segmentosRadial);
    const material = new THREE.MeshPhongMaterial({
        color,
        opacity: 0.7,
        transparent: true,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = -Math.PI / 2;
    mesh.position.set(0, 0, 0);
    state.scene.add(mesh);
    state.meshes.push(mesh);
}

function generarSolidoY(formula, color = 0x28a745) {
    const { A, B } = getLimits();
    const state = viewStates.graph3DY;
    if (!state.scene || !formula.trim()) return;

    const profilePoints = [];
    const step = (B - A) / segmentosRadial;

    for (let i = 0; i <= segmentosRadial; i++) {
        const x = A + i * step;
        const y = evaluateFunction(formula, x);
        if (!isNaN(y)) {
            profilePoints.push(new THREE.Vector2(Math.abs(x), y));
        }
    }

    if (profilePoints.length < 2) return;

    const geometry = new THREE.LatheGeometry(profilePoints, segmentosRadial);
    const material = new THREE.MeshPhongMaterial({
        color,
        opacity: 0.7,
        transparent: true,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    state.scene.add(mesh);
    state.meshes.push(mesh);
}

// ==============================
// INTERACCIÓN Y BOTONES
// ==============================

function clearSolidos(viewId) {
    const state = viewStates[viewId];
    state.meshes.forEach(m => {
        state.scene.remove(m);
        m.geometry?.dispose();
        m.material?.dispose();
    });
    state.meshes = [];
}

function graficarTodo() {
    const raw1 = document.getElementById('funcion1').value.trim();
    const raw2 = document.getElementById('funcion2').value.trim();
    const formulas = [];
    if (raw1) formulas.push(raw1);
    if (raw2) formulas.push(raw2);

    if (formulas.length === 1) {
        generarCurva2D(formulas[0]);
    } else if (formulas.length > 1) {
        generarCurvas2D(formulas);
    }

    clearSolidos('graph3DX');
    clearSolidos('graph3DY');

    if (raw1) {
        generarSolidoX(raw1, 0x007bff);
        generarSolidoY(raw1, 0x28a745);
    }
    if (raw2) {
        generarSolidoX(raw2, 0xff1493);
        generarSolidoY(raw2, 0x00ced1);
    }
}

function limpiarTodo() {
    document.getElementById('funcion1').value = '';
    document.getElementById('funcion2').value = '';
    document.getElementById('limiteA').value = '';
    document.getElementById('limiteB').value = '';

    const state2D = viewStates.graph2D;
    if (state2D.mesh) {
        state2D.scene.remove(state2D.mesh);
        state2D.mesh.geometry?.dispose();
        state2D.mesh.material?.dispose();
        state2D.mesh = null;
    }

    clearSolidos('graph3DX');
    clearSolidos('graph3DY');
}

// ==============================
// INTERACCIÓN CON TABLA DE EJEMPLOS
// ==============================

function seleccionarEjemplo(row) {
    const funcion = row.getAttribute('data-funcion');
    const a = row.getAttribute('data-a');
    const b = row.getAttribute('data-b');

    document.getElementById('funcion1').value = funcion;
    document.getElementById('funcion2').value = '';
    document.getElementById('limiteA').value = a;
    document.getElementById('limiteB').value = b;

    graficarTodo();
}

// ==============================
// INICIALIZACIÓN AUTOMÁTICA
// ==============================

document.addEventListener('DOMContentLoaded', () => {
    initView('graph2D', document.getElementById('graph2D'), false);
    initView('graph3DX', document.getElementById('graph3DX'));
    initView('graph3DY', document.getElementById('graph3DY'));
    graficarTodo();
});

window.graficarTodo = graficarTodo;
window.limpiarTodo = limpiarTodo;
window.seleccionarEjemplo = seleccionarEjemplo;
