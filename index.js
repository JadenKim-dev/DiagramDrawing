const drawingPanel = document.getElementById('drawing-panel');
// const peerList = document.getElementById('peer-list');

async function main() {
    try {
        const client = yorkie.createClient('http://localhost:8080');
        await client.activate();

        const doc = yorkie.createDocument(`example-${getYYYYMMDD()}`);
        await client.attach(doc);

        // await createPeerAwareness(client, doc, peerList);
        await createDrawingExample(client, doc, drawingPanel);
    } catch (e) {
        console.error(e);
    }
}

main();

function getYYYYMMDD() {
  const now = new Date();
  return`${now.getUTCFullYear()}${('0' + (now.getUTCMonth() + 1)).slice(-2)}${('0' + now.getUTCDate()).slice(-2)}`;
}

function paintCanvas(drawingPanel, shapes) {
    // TODO Now repainting the whole thing. Only changed parts should be drawn.
    const context = drawingPanel.getContext('2d');
    context.clearRect(0, 0, drawingPanel.offsetWidth, drawingPanel.offsetHeight);

    for (const shape of shapes) {
        context.beginPath();
        let isMoved = false;
        for (const p of shape.points) {
            if (isMoved === false) {
                isMoved = true;
                context.moveTo(p.x, p.y);
            } else {
                context.lineTo(p.x, p.y);
            }
        }

        context.stroke();
    }
}

function getPoint(drawingPanel, e) {
    if (!!e.touches) {
        return {
            x: parseInt(e.touches[0].clientX - drawingPanel.offsetLeft + window.scrollX),
            y: parseInt(e.touches[0].clientY - drawingPanel.offsetTop + window.scrollY)
        };
    } else {
        return {
            x: e.clientX - drawingPanel.offsetLeft + window.scrollX,
            y: e.clientY - drawingPanel.offsetTop + window.scrollY
        };
    }
}

async function createDrawingExample(client, doc, drawingPanel) {
    doc.update((root) => {
        if (!root.shapes) {
            root.shapes = [];
        }
    }, 'create points if not exists');

    doc.subscribe((event) => {
        paintCanvas(drawingPanel, doc.getRoot().shapes);
    });
    await client.sync();

    const handlers = {
        'begin': (e) => {
            const point = getPoint(drawingPanel, e);
            if (point.x < 0 || point.y < 0 ||
                point.x > drawingPanel.offsetWidth || point.y > drawingPanel.offsetHeight) {
                return;
            }

            window.isStartDragging = true;
            doc.update((root) => {
                root.shapes.push({
                    points: [point]
                });
                window.currentID = root.shapes.getLast().getID();
            }, `update content by ${client.getID()}`);
        },

        'move': (e) => {
            if (!window.isStartDragging) {
                return;
            }

            const point = getPoint(drawingPanel, e);
            if (point.x < 0 || point.y < 0 ||
                point.x > drawingPanel.offsetWidth || point.y > drawingPanel.offsetHeight) {
                e.preventDefault();
                return;
            }

            doc.update((root) => {
                console.log(point);
                const shape = root.shapes.getElementByID(window.currentID);
                shape.points.push(point);
                paintCanvas(drawingPanel, root.shapes);
            }, `update content by ${client.getID()}`);
        },

        'end': (e) => {
            if (window.isStartDragging) {
                window.isStartDragging = false;
            }
        },
    };

    // for desktop
    document.addEventListener('mousedown', handlers['begin']);
    document.addEventListener('mousemove', handlers['move']);
    document.addEventListener('mouseup', handlers['end']);

    // for touch devices
    document.addEventListener('touchstart', handlers['begin']);
    document.addEventListener('touchmove', handlers['move']);
    document.addEventListener('touchend', handlers['end']);

    // 05. set initial value.
    paintCanvas(drawingPanel, doc.getRoot().shapes);
}