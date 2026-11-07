//
// Workout card canvas
//
// Draws the card defined by workout-card.js.

import { pointsFor } from './workout-card.js';

const COLOR = {
    bg: '#28272D',
    text: '#ffffff',
    muted: '#aaaaaa',
    plot: '#35363a',
    power: '#F8C73A',
    powerFill: 'rgba(248, 199, 58, 0.35)',
    heartRate: '#FE340B',
    smo2: '#57C057',
    thb: '#FF663A',
    ftp: '#8a8a93',
};

const FONT = 'Roboto, sans-serif';

const LINE = [
    { key: 'heartRate', color: COLOR.heartRate, label: 'Heart rate' },
    { key: 'smo2', color: COLOR.smo2, label: 'SmO2' },
    { key: 'thb', color: COLOR.thb, label: 'THb' },
];

function loadLogo() {
    const image = document.querySelector('#auuki-logo-letters');
    if(!image) return Promise.reject(new Error('Could not load the Auuki logo.'));
    if(image.complete && image.naturalWidth > 0) return Promise.resolve(image);
    return new Promise((resolve, reject) => {
        image.addEventListener('load', () => resolve(image), { once: true });
        image.addEventListener('error', () => {
            reject(new Error('Could not load the Auuki logo.'));
        }, { once: true });
    });
}

// The file's black background would show up as a black box on #28272D.
function knockOutBlack(image) {
    const plate = document.createElement('canvas');
    plate.width = image.naturalWidth || image.width;
    plate.height = image.naturalHeight || image.height;
    const ctx = plate.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, plate.width, plate.height);
    const px = imageData.data;
    for(let i = 0; i < px.length; i += 4) {
        if(px[i] < 28 && px[i + 1] < 28 && px[i + 2] < 28) {
            px[i + 3] = 0;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return plate;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
    if(ctx.measureText(text).width <= maxWidth) return text;
    let shown = text;
    while(shown.length > 1 && ctx.measureText(`${shown}…`).width > maxWidth) {
        shown = shown.slice(0, -1);
    }
    return `${shown}…`;
}

function drawLogo(ctx, logo, card) {
    const cut = knockOutBlack(logo);
    const height = 56;
    const width = Math.round(height * (cut.width / cut.height));
    const x = card.width - 64 - width;
    const y = 42;
    ctx.drawImage(cut, x, y, width, height);
    return x;
}

function drawHeader(ctx, card, logoLeft) {
    const maxWidth = Math.max(200, logoLeft - 64 - 28);
    ctx.fillStyle = COLOR.text;
    ctx.font = `600 44px ${FONT}`;
    ctx.fillText(fitText(ctx, card.name, maxWidth), 64, 86);
    if(card.dateLabel) {
        ctx.fillStyle = COLOR.muted;
        ctx.font = `24px ${FONT}`;
        ctx.fillText(card.dateLabel, 64, 124);
    }
}

function drawTiles(ctx, card) {
    const tiles = card.tiles;
    if(tiles.length === 0) return;
    const x0 = 64;
    const gap = 18;
    const width = (card.width - 128 - gap * (tiles.length - 1)) / tiles.length;
    for(let i = 0; i < tiles.length; i++) {
        const x = x0 + i * (width + gap);
        ctx.fillStyle = COLOR.muted;
        ctx.font = `18px ${FONT}`;
        ctx.fillText(tiles[i].label, x, 186);
        ctx.fillStyle = COLOR.text;
        ctx.font = `30px ${FONT}`;
        ctx.fillText(tiles[i].value, x, 226);
    }
}

function strokeSeries(ctx, points, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let drawing = false;
    for(let i = 0; i < points.length; i++) {
        const point = points[i];
        if(!point) {
            drawing = false;
            continue;
        }
        if(!drawing) {
            ctx.moveTo(point.x, point.y);
            drawing = true;
        } else {
            ctx.lineTo(point.x, point.y);
        }
    }
    ctx.stroke();
    ctx.restore();
}

function fillPower(ctx, points, plot) {
    const baseline = plot.y + plot.height;
    ctx.save();
    ctx.beginPath();
    let run = [];
    function closeRun() {
        if(run.length === 0) return;
        ctx.moveTo(run[0].x, baseline);
        for(let i = 0; i < run.length; i++) ctx.lineTo(run[i].x, run[i].y);
        ctx.lineTo(run[run.length - 1].x, baseline);
        ctx.closePath();
        run = [];
    }
    for(let i = 0; i < points.length; i++) {
        if(!points[i]) closeRun();
        else run.push(points[i]);
    }
    closeRun();
    ctx.fillStyle = COLOR.powerFill;
    ctx.fill();
    ctx.restore();
}

function drawFtp(ctx, card) {
    if(!card.ftp || !card.series.power) return;
    const plot = card.plot;
    const y = pointsFor([card.ftp], card.series.power.scale, {
        x: plot.x,
        y: plot.y,
        width: 0,
        height: plot.height,
    })[0].y;
    ctx.save();
    ctx.strokeStyle = COLOR.ftp;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.width, y);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLOR.muted;
    ctx.font = `18px ${FONT}`;
    const label = `FTP ${Math.round(card.ftp)}`;
    const labelY = y < plot.y + 28 ? y + 22 : y - 10;
    ctx.fillText(label, plot.x + 12, labelY);
}

function drawPlot(ctx, card) {
    const plot = card.plot;
    roundRect(ctx, plot.x, plot.y, plot.width, plot.height, 16);
    ctx.fillStyle = COLOR.plot;
    ctx.fill();

    const power = card.series.power;
    const anyLine = power || card.series.heartRate || card.series.smo2 || card.series.thb;
    if(!anyLine) {
        ctx.fillStyle = COLOR.muted;
        ctx.font = `28px ${FONT}`;
        ctx.fillText('No recorded metrics', plot.x + 36, plot.y + plot.height / 2);
        return;
    }

    drawFtp(ctx, card);

    if(power) {
        const points = pointsFor(power.buckets, power.scale, plot);
        fillPower(ctx, points, plot);
        strokeSeries(ctx, points, COLOR.power, 3);
    }
    for(let i = 0; i < LINE.length; i++) {
        const spec = LINE[i];
        const series = card.series[spec.key];
        if(!series) continue;
        strokeSeries(ctx, pointsFor(series.buckets, series.scale, plot), spec.color, 3);
    }
}

function drawLegend(ctx, card) {
    const items = [];
    if(card.series.power) items.push({ color: COLOR.power, label: 'Power' });
    for(let i = 0; i < LINE.length; i++) {
        if(card.series[LINE[i].key]) items.push(LINE[i]);
    }
    let x = 64;
    const y = card.height - 52;
    ctx.font = `20px ${FONT}`;
    for(let i = 0; i < items.length; i++) {
        ctx.fillStyle = items[i].color;
        roundRect(ctx, x, y - 14, 22, 8, 4);
        ctx.fill();
        x += 32;
        ctx.fillStyle = COLOR.text;
        ctx.fillText(items[i].label, x, y);
        x += ctx.measureText(items[i].label).width + 28;
    }
}

async function renderWorkoutCard(card) {
    if(document.fonts?.ready) await document.fonts.ready;
    const logo = await loadLogo();
    const canvas = document.createElement('canvas');
    canvas.width = card.width;
    canvas.height = card.height;
    const ctx = canvas.getContext('2d');
    if(!ctx) throw new Error('This browser cannot draw the workout image.');

    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, card.width, card.height);
    ctx.textBaseline = 'alphabetic';

    const logoLeft = drawLogo(ctx, logo, card);
    drawHeader(ctx, card, logoLeft);
    drawTiles(ctx, card);
    drawPlot(ctx, card);
    drawLegend(ctx, card);
    return canvas;
}

function canvasToJpeg(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if(!blob) {
                reject(new Error('Could not encode the workout image.'));
                return;
            }
            resolve(blob);
        }, 'image/jpeg', 0.92);
    });
}

async function renderWorkoutCardJpeg(card) {
    const canvas = await renderWorkoutCard(card);
    return canvasToJpeg(canvas);
}

export {
    renderWorkoutCard,
    renderWorkoutCardJpeg,
};
