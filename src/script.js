if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

/**
 * 定数と設定
 */
const TILE_SIZE = 6; // 描画時の1タイルのピクセルサイズ
const COLORS = {
    WATER: '#1a2a3a',
    LAND: '#3c4d3c',
    MOUNTAIN: '#4a4a4a',
    RIVER: '#2980b9',
    MAJOR_RIVER: '#1f618d',
    SNOW: '#ecf0f1'
};
const RELIGIONS = ['太陽神教', '海霊信仰', '機械崇拝', '自然の秩序', '混沌', '虚無'];
const TECH_LEVELS = ['原始的', '農耕社会', '工業化', '現代的', '未来的'];
const KANJI_CHARS = ["龍", "鳳", "蒼", "天", "央", "日", "月", "星", "雲", "雷", "風", "火", "水", "土", "木", "金", "銀", "鉄", "皇", "王", "帝", "聖", "神", "魔", "霊", "幻", "夢", "愛", "恋", "哀", "愁", "喜", "楽", "怒", "憎", "善", "悪", "真", "偽", "正", "邪", "明", "暗", "白", "黒", "赤", "青", "黄", "緑", "紫", "紅", "碧", "朱", "玄", "旭", "暁", "曙", "霞", "霧", "嵐", "雪", "氷", "霜", "露", "雨", "空", "海", "洋", "湖", "河", "川", "山", "岳", "峰", "丘", "谷", "峡", "洞", "岩", "石", "砂", "泥", "土", "田", "畑", "森", "林", "樹", "草", "花", "葉", "根", "実", "種", "芽", "翼", "羽", "毛", "皮", "肉", "骨", "血", "心", "眼", "耳", "口", "手", "足", "身", "力", "知", "智", "信", "義", "礼", "仁", "徳", "道", "法", "理", "気", "術", "芸", "文", "武", "戦", "争", "兵", "軍", "国", "邦", "都", "京", "市", "町", "村", "里", "家", "宮", "殿", "城", "塞", "塔", "門", "橋", "道", "路", "港", "津", "浦", "浜", "岸", "島"];

function getNationSuffix(n) {
    if (n.isPuppet) {
        let masterName = "";
        if (n.masterId !== -1) {
            const master = nations.find(m => m.id === n.masterId);
            if (master) masterName = master.name;
        }
        if (masterName) {
            return { prefix: masterName + "領", suffix: "" };
        } else {
            return { prefix: "", suffix: "傀儡統治機構国" };
        }
    }
    
    if (n.isGrandEmpire) {
        return { prefix: "大", suffix: "帝国" };
    }

    let suffix = "国";
    // Suffix logic based on detailed political system
    if (n.sysDetailed && (n.sysDetailed.includes('君主') || n.sovereign === '君主')) {
        if (n.sysDetailed === '帝国' || (n.id % 5 === 0)) suffix = "帝国";
        else suffix = "王国";
        if (n.sysDetailed === '公国') suffix = "公国";
    } else if (n.sysDetailed && (n.sysDetailed.includes('軍事') || n.sovereign === '軍部')) {
        suffix = "軍事政権";
    } else if (n.sysDetailed && (n.sysDetailed.includes('神権') || n.sovereign === '宗教指導者')) {
        suffix = "神聖国";
    } else if (n.sysBroad === '民主主義') {
        suffix = "共和国";
        if (n.stateStruct === '連邦国家') suffix = "連邦" + suffix;
        if (n.stateStruct === '国家連合') suffix = "連合";
        if (n.sysDetailed === '大統領制' && n.stateStruct === '連邦国家') suffix = "合衆国"; // Flavor override
    } else if (n.sysBroad === '全体主義') {
        if (n.ecoIdeology && (n.ecoIdeology.includes('計画') || n.ecoIdeology.includes('統制'))) suffix = "社会主義共和国";
        else suffix = "独裁国";
    }
    
    // Special cases
    if (n.sysDetailed === "革命政府") suffix = "革命政府";
    if (n.sysDetailed === "臨時政府") suffix = "臨時政府";
    if (n.sysDetailed === "正統政府") suffix = "正統政府";
    if (n.sysDetailed === "暫定政府") suffix = "暫定政府";
    if (n.sysDetailed === "暫定統治機構") suffix = "暫定統治機構";

    if (n.sysBroad === '民主主義' && n.regimeNumber > 1) {
        suffix += "第" + n.regimeNumber + "政";
    }
    
    return { prefix: "", suffix: suffix };
}

const POLITICAL_SYSTEMS = {
    ECONOMIC: ['自由放任主義', '社会的市場経済', '混合経済', '計画経済', '統制経済', '協同組合主義', '重商主義', '農本主義'],
    BROAD: ['民主主義', '権威主義', '全体主義'],
    DETAILED: {
        '民主主義': ['議院内閣制', '大統領制', '半大統領制', '二元代表制'],
        '権威主義': ['絶対君主制', '立憲君主制', '軍事評議会制', '選挙君主制', '個人独裁制'],
        '全体主義': ['一党独裁制', '神権政治', '前衛党独裁', '軍事独裁制']
    },
    STRUCTURE: ['単一国家', '連邦国家', '国家連合'],
    SOVEREIGN: {
        '民主主義': ['国民'],
        '権威主義': ['君主', '独裁者', '軍部', '貴族議会'],
        '全体主義': ['党', '宗教指導者', '独裁者']
    }
};

function generatePoliticalSystem(currentTech) {
    // 1. Broad Framework (Weight by Tech)
    let broad;
    if (!isDemocracyAwakened) {
        broad = Math.random() < 0.7 ? '権威主義' : '全体主義';
    } else if (currentTech < 2) { // Primitive/Agrarian -> mostly Authoritarian
        broad = Math.random() < 0.8 ? '権威主義' : (Math.random() < 0.5 ? '全体主義' : '民主主義');
    } else {
        broad = POLITICAL_SYSTEMS.BROAD[Math.floor(Math.random() * POLITICAL_SYSTEMS.BROAD.length)];
    }
    
    // 2. Detailed System
    let details = POLITICAL_SYSTEMS.DETAILED[broad];
    if (!isDemocracyAwakened && broad === '権威主義') {
        details = details.filter(d => d !== '立憲君主制');
    }
    if (!isSocialismSprouted && broad === '全体主義') {
        details = details.filter(d => d !== '前衛党独裁');
    }
    const detailed = details[Math.floor(Math.random() * details.length)];
    
    // 3. Sovereign
    let sovereigns = POLITICAL_SYSTEMS.SOVEREIGN[broad];
    // Specific logic overrides
    if (detailed.includes('君主')) {
        sovereigns = ['君主'];
    } else if (detailed.includes('軍事')) {
        sovereigns = ['軍部', '独裁者'];
    } else if (detailed.includes('神権')) {
        sovereigns = ['宗教指導者', '神'];
    }
    const sovereign = sovereigns[Math.floor(Math.random() * sovereigns.length)];

    // 4. State Structure
    const structure = POLITICAL_SYSTEMS.STRUCTURE[Math.floor(Math.random() * POLITICAL_SYSTEMS.STRUCTURE.length)];

    // 5. Economic Ideology
    let possibleEcos = [...POLITICAL_SYSTEMS.ECONOMIC];
    // Filter based on era/tech
    if (currentTech < 2) {
        possibleEcos = ['重商主義', '農本主義', '統制経済'];
    } else {
        // Filter based on politics
        if (broad === '全体主義' || detailed.includes('計画') || detailed.includes('社会主義')) {
             possibleEcos = isSocialismSprouted ? ['計画経済', '統制経済'] : ['統制経済'];
        } else if (broad === '民主主義') {
             possibleEcos = ['自由放任主義', '社会的市場経済', '混合経済', '協同組合主義'];
        } else if (detailed.includes('絶対君主')) {
             possibleEcos = ['重商主義', '統制経済', '混合経済', '農本主義'];
        }
    }
    // Fallback if empty (shouldn't happen but safety)
    if (possibleEcos.length === 0) possibleEcos = POLITICAL_SYSTEMS.ECONOMIC;
    
    const eco = possibleEcos[Math.floor(Math.random() * possibleEcos.length)];

    return {
        sysBroad: broad,
        sysDetailed: detailed,
        sovereign: sovereign,
        stateStruct: structure,
        ecoIdeology: eco
    };
}

// グローバル変数
let canvas, ctx, width, height;
let currentScenario = 'BLITZKRIEG';
let activeScenario = 'BLITZKRIEG'; // Scenario used for generation (latched)
let grid = []; // 0:Water, 1:Land, 2:Mountain, 3:River, 4:Major River
let elevationGrid = []; // 0.0 - 1.0
let militaryGrid = []; // 0.0 - 1.0 (Troop density)
let ownerGrid = []; // ID of the nation owning this tile (-1 for none)
let nations = [];
let nationIdCounter = 0;
let isDrawing = true;
let isTerrainEditMode = false;
let isFillMode = false;
let currentBrush = 1; // 1:Land, 0:Water
let mapMode = 'political'; // political or terrain
let mapScale = 1.0;
let isPaused = true;
let simSpeed = 5;
let frameCounter = 0;
let worldTension = 0;
let year = 1;
let animationFrame;
let selectedNationId = -1;
let continentMap = [];
let mapDirty = true;
let hegemonId = -1;
let hegemonStatus = "";
let highTensionDuration = 0;
let isDemocracyAwakened = false;
let isSocialismSprouted = false;
let internationalAllianceId = -1;
let internationalVersion = 1;
let alliedNationsId = -1;

let alliances = [];
let allianceIdCounter = 0;
let organizations = [];
let orgIdCounter = 0;

// マウス操作用
let mousePressed = false;
let mouseButton = 0; // 0:Left, 2:Right

function isNationNameTaken(name, excludeId = -1) {
    return nations.some(n => n.id !== excludeId && n.name === name);
}

function isBaseNameTaken(name, excludeId = -1) {
    return nations.some(n => n.id !== excludeId && n.baseName === name);
}

function isCityNameTaken(name) {
    for (const n of nations) {
        if (n.cities.some(c => c.name === name)) return true;
    }
    return false;
}

function updateContinents() {
    continentMap = new Array(width * height).fill(-1);
    let currentContinentId = 0;
    
    for (let i = 0; i < width * height; i++) {
        // Skip water or already visited
        if (grid[i] === 0 || continentMap[i] !== -1) continue;
        
        // Start BFS
        let queue = [i];
        continentMap[i] = currentContinentId;
        
        while(queue.length > 0) {
            let curr = queue.shift();
            let cx = curr % width;
            let cy = Math.floor(curr / width);
            
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
                let nx = cx + dx;
                let ny = cy + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    let nIdx = ny * width + nx;
                    if (grid[nIdx] !== 0 && continentMap[nIdx] === -1) {
                        continentMap[nIdx] = currentContinentId;
                        queue.push(nIdx);
                    }
                }
            });
        }
        currentContinentId++;
    }
}

/**
 * 初期化
 */
window.onload = () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // キャンバスサイズ調整
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // グリッド初期化 (画面サイズに応じてデフォルト設定)
    let defaultSize = 128;
    if (window.innerWidth <= 768) {
        defaultSize = 64; // スマホなどは小サイズ
    }
    document.getElementById('mapSize').value = defaultSize;
    initGrid(defaultSize);

    // イベントリスナー
    setupInput();
    
    // ループ開始
    loop();
};

function resizeCanvas() {
    const container = document.getElementById('canvas-wrapper');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function initGrid(size) {
    width = size;
    height = size;
    grid = new Array(width * height).fill(0);
    elevationGrid = new Array(width * height).fill(0);
    militaryGrid = new Array(width * height).fill(0);
    ownerGrid = new Array(width * height).fill(-1);
    continentMap = new Array(width * height).fill(-1);
    nations = [];
    isDrawing = true;
    year = 1;
    document.getElementById('log').innerHTML = '';
}

// Simple Value Noise 2D
const noise2D = (function() {
    const tableSize = 256;
    const r = new Array(tableSize);
    const permutation = new Array(tableSize * 2);

    for (let i = 0; i < tableSize; i++) {
        r[i] = Math.random();
        permutation[i] = i;
    }

    for (let i = 0; i < tableSize; i++) {
        const j = Math.floor(Math.random() * tableSize);
        const temp = permutation[i];
        permutation[i] = permutation[j];
        permutation[j] = temp;
        permutation[i + tableSize] = permutation[i];
    }

    function lerp(t, a, b) {
        return a + t * (b - a);
    }

    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    return function(x, y) {
        const xi = Math.floor(x) & 255;
        const yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const u = fade(xf);
        const v = fade(yf);

        const aa = r[permutation[permutation[xi] + yi]];
        const ab = r[permutation[permutation[xi] + yi + 1]];
        const ba = r[permutation[permutation[xi + 1] + yi]];
        const bb = r[permutation[permutation[xi + 1] + yi + 1]];

        return lerp(v, lerp(u, aa, ba), lerp(u, ab, bb));
    };
})();

function fbm(x, y, octaves) {
    let val = 0;
    let amp = 0.5;
    let freq = 1;
    for(let i=0; i<octaves; i++) {
        val += noise2D(x*freq, y*freq) * amp;
        amp *= 0.5;
        freq *= 2;
    }
    return val;
}

/**
 * 入力処理
 */
function setupInput() {
    // 描画ツール
    canvas.addEventListener('mousedown', e => {
        mousePressed = true;
        mouseButton = e.button;
        handleDraw(e);
        handleSelect(e);
    });
    canvas.addEventListener('mousemove', e => {
        handleDraw(e);
        handleHover(e);
    });
    window.addEventListener('mouseup', () => mousePressed = false);

    // タッチ操作対応
    canvas.addEventListener('touchstart', e => {
        mousePressed = true;
        mouseButton = 0; // タッチは左クリック扱い
        handleDraw(e);
        handleSelect(e);
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        handleDraw(e);
        handleHover(e);
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => {
        mousePressed = false;
    });
    
    // 右クリックメニュー無効化
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // UIボタン
    document.getElementById('mapSize').addEventListener('change', (e) => {
        initGrid(parseInt(e.target.value));
    });

    document.getElementById('scenarioSelect').addEventListener('change', (e) => {
        currentScenario = e.target.value;
    });

    document.getElementById('btn-generate').addEventListener('click', () => {
        generateWorld();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
        isPaused = !isPaused;
    });

    document.getElementById('btn-map-mode').addEventListener('click', (e) => {
        if (mapMode === 'political') {
            mapMode = 'terrain';
            e.target.innerText = '地図モード: 地形';
        } else if (mapMode === 'terrain') {
            mapMode = 'military';
            e.target.innerText = '地図モード: 軍事';
        } else if (mapMode === 'military') {
            mapMode = 'alliance';
            e.target.innerText = '地図モード: 同盟';
        } else {
            mapMode = 'political';
            e.target.innerText = '地図モード: 政治';
        }
    });

    document.getElementById('simSpeed').addEventListener('input', (e) => {
        simSpeed = parseInt(e.target.value);
    });

    function syncEditButtons() {
        const fillBtn = document.getElementById('btn-fill');
        const fillBtnSim = document.getElementById('btn-fill-sim');
        const brushBtn = document.getElementById('btn-brush');
        const brushBtnSim = document.getElementById('btn-brush-sim');

        const fillText = `塗りつぶしモード: ${isFillMode ? 'オン' : 'オフ'}`;
        const fillBg = isFillMode ? '#4db8ff' : '#34495e';
        const fillColor = isFillMode ? '#000' : '#ecf0f1';

        [fillBtn, fillBtnSim].forEach(btn => {
            if (btn) {
                btn.innerText = fillText;
                btn.style.background = fillBg;
                btn.style.color = fillColor;
            }
        });

        const brushText = `ブラシ: ${currentBrush === 1 ? '陸地' : '海'}`;
        const brushBg = currentBrush === 1 ? '#34495e' : '#2980b9';

        [brushBtn, brushBtnSim].forEach(btn => {
            if (btn) {
                btn.innerText = brushText;
                btn.style.background = brushBg;
            }
        });
    }

    document.getElementById('btn-fill').addEventListener('click', () => {
        isFillMode = !isFillMode;
        syncEditButtons();
    });

    document.getElementById('btn-fill-sim').addEventListener('click', () => {
        isFillMode = !isFillMode;
        syncEditButtons();
    });

    document.getElementById('btn-brush').addEventListener('click', () => {
        currentBrush = currentBrush === 1 ? 0 : 1;
        syncEditButtons();
    });

    document.getElementById('btn-brush-sim').addEventListener('click', () => {
        currentBrush = currentBrush === 1 ? 0 : 1;
        syncEditButtons();
    });

    document.getElementById('btn-terrain-edit').addEventListener('click', (e) => {
        isTerrainEditMode = !isTerrainEditMode;
        e.target.innerText = `🛠 地形編集: ${isTerrainEditMode ? 'オン' : 'オフ'}`;
        e.target.style.background = isTerrainEditMode ? '#e67e22' : '#d35400';
        document.getElementById('sim-edit-tools').style.display = isTerrainEditMode ? 'block' : 'none';
        
        if (isTerrainEditMode) {
            // 地形編集モード時は、一時的に地図モードを「地形」に切り替えると編集しやすいかも
            // ただし強制はしない
        }
    });

    document.getElementById('btn-history').addEventListener('click', () => {
        if (selectedNationId === -1) return;
        const n = nations.find(nat => nat.id === selectedNationId);
        if (!n) return;
        
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        
        n.history.forEach(h => {
            const item = document.createElement('div');
            item.style.marginBottom = "5px";
            item.style.borderBottom = "1px solid #333";
            item.style.paddingBottom = "2px";
            item.innerText = `[Y${h.year}] ${h.event}`;
            list.appendChild(item);
        });
        
        document.getElementById('history-modal').style.display = 'block';
    });

    document.getElementById('btn-relations').addEventListener('click', () => {
        openRelationsModal();
    });

    document.getElementById('btn-rulebook').addEventListener('click', () => {
        document.getElementById('rulebook-modal').style.display = 'block';
    });

    document.getElementById('btn-ranking').addEventListener('click', () => {
        openRankingModal();
    });

    document.getElementById('btn-alliances').addEventListener('click', () => {
        openAlliancesModal();
    });

    // Save/Load
    document.getElementById('btn-save').addEventListener('click', saveGame);
    
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadGame(e.target.files[0]);
            e.target.value = ''; // Reset
        }
    });

    document.getElementById('btn-load-menu').addEventListener('click', () => fileInput.click());
    document.getElementById('btn-load-sim').addEventListener('click', () => fileInput.click());

    // Edit Nation Modal
    document.getElementById('btn-edit-nation').addEventListener('click', openEditNationModal);
    document.getElementById('edit-n-basename').addEventListener('input', updateEditPreview);
    document.getElementById('edit-n-sys-broad').addEventListener('change', (e) => {
        updateDetailedAndSovereignOptions(e.target.value);
        updateEditPreview();
    });
    document.getElementById('edit-n-sys-detailed').addEventListener('change', updateEditPreview);
    document.getElementById('edit-n-struct').addEventListener('change', updateEditPreview);
    document.getElementById('edit-n-sov').addEventListener('change', updateEditPreview);
    document.getElementById('edit-n-eco').addEventListener('change', updateEditPreview);

    document.getElementById('btn-edit-cancel').addEventListener('click', () => {
        document.getElementById('edit-nation-modal').style.display = 'none';
    });

    document.getElementById('btn-edit-save').addEventListener('click', () => {
        if (selectedNationId === -1) return;
        const n = nations.find(nat => nat.id === selectedNationId);
        if (!n) return;

        n.baseName = document.getElementById('edit-n-basename').value;
        n.sysBroad = document.getElementById('edit-n-sys-broad').value;
        n.sysDetailed = document.getElementById('edit-n-sys-detailed').value;
        n.govType = n.sysDetailed;
        n.stateStruct = document.getElementById('edit-n-struct').value;
        n.sovereign = document.getElementById('edit-n-sov').value;
        n.ecoIdeology = document.getElementById('edit-n-eco').value;

        // If changed to democracy and had no parties, generate them
        if (n.sysBroad === '民主主義' && (!n.parties || n.parties.length === 0)) {
            n.generateParties();
        }

        n.updateName();
        updateNationPanel();
        mapDirty = true;
        document.getElementById('edit-nation-modal').style.display = 'none';
        
        log(`${n.name}の国家体制が編集されました。`, "log-info");
    });
}

function openRelationsModal() {
    if (selectedNationId === -1) return;
    const n = nations.find(nat => nat.id === selectedNationId);
    if (!n) return;

    const list = document.getElementById('relations-list');
    list.innerHTML = '';
    
    // Sort logic
    const targets = nations.filter(t => t.id !== n.id && !t.isDead);
    
    targets.sort((a, b) => {
        // Priority: War > Master > Puppet > Ally > Relation(Low->High)
        const aWar = n.atWarWith.includes(a.id) ? 1 : 0;
        const bWar = n.atWarWith.includes(b.id) ? 1 : 0;
        if (aWar !== bWar) return bWar - aWar;
        
        const aMaster = (n.isPuppet && n.masterId === a.id) ? 1 : 0;
        const bMaster = (n.isPuppet && n.masterId === b.id) ? 1 : 0;
        if (aMaster !== bMaster) return bMaster - aMaster;

        const aPuppet = (a.isPuppet && a.masterId === n.id) ? 1 : 0;
        const bPuppet = (b.isPuppet && b.masterId === n.id) ? 1 : 0;
        if (aPuppet !== bPuppet) return bPuppet - aPuppet;

        const aAlly = n.allies.includes(a.id) ? 1 : 0;
        const bAlly = n.allies.includes(b.id) ? 1 : 0;
        if (aAlly !== bAlly) return bAlly - aAlly;

        const aRel = n.relations[a.id] || 0;
        const bRel = n.relations[b.id] || 0;
        return aRel - bRel; // Low relations first
    });

    if (targets.length === 0) {
        list.innerHTML = '<div style="color:#aaa; text-align:center;">他国は存在しません。</div>';
        document.getElementById('relations-modal').style.display = 'block';
        return;
    }

    targets.forEach(t => {
        const item = document.createElement('div');
        item.style.marginBottom = "8px";
        item.style.padding = "8px";
        item.style.backgroundColor = "#333";
        item.style.borderRadius = "4px";
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.justifyContent = "space-between";

        const relVal = Math.floor(n.relations[t.id] || 0);
        let statusText = "";
        let statusColor = "#ccc";
        let relColor = "#ccc";

        // Status Logic
        if (n.atWarWith.includes(t.id)) {
            statusText = "交戦中";
            statusColor = "#ff6b6b";
            item.style.border = "1px solid #e74c3c";
        } else if (n.isPuppet && n.masterId === t.id) {
            statusText = "宗主国";
            statusColor = "#f1c40f";
        } else if (t.isPuppet && t.masterId === n.id) {
            statusText = "傀儡国";
            statusColor = "#2ecc71";
        } else if (n.allies.includes(t.id)) {
            statusText = "同盟国";
            statusColor = "#00cec9";
            item.style.border = "1px solid #00cec9";
        } else {
            if (relVal >= 50) statusText = "友好";
            else if (relVal <= -50) statusText = "敵対";
            else statusText = "中立";
        }

        // Relation Color
        if (relVal > 0) relColor = `rgb(${255 - relVal*2.5}, 255, ${255 - relVal*2.5})`; // White to Green
        else relColor = `rgb(255, ${255 + relVal*2.5}, ${255 + relVal*2.5})`; // White to Red

        item.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight:bold; color:${t.color}; font-size:1.0em;">${t.name}</div>
                <div style="font-size:0.8em; color:#aaa;">GDP: ${formatNum(t.gdp)} | 軍事: ${formatNum(t.getMilitaryPower())}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:bold; color:${statusColor}; font-size:0.9em; margin-bottom:2px;">${statusText}</div>
                <div style="font-size:0.8em; color:${relColor}; background:#222; padding:2px 5px; border-radius:3px; display:inline-block; min-width:40px; text-align:center;">
                    ${relVal > 0 ? "+" : ""}${relVal}
                </div>
            </div>
        `;

        list.appendChild(item);
    });

    document.getElementById('relations-modal').style.display = 'block';
}

function openRankingModal() {
    document.getElementById('ranking-modal').style.display = 'block';
    renderRankingContent();
}

function openAlliancesModal() {
    document.getElementById('alliances-modal').style.display = 'block';
    renderAlliancesContent();
}

function renderAlliancesContent() {
    const content = document.getElementById('alliances-content');
    content.innerHTML = '';

    if (alliances.length === 0 && organizations.length === 0) {
        content.innerHTML = '<div style="color:#aaa; text-align:center; padding:20px;">現在、有効な同盟や国際機関はありません。</div>';
        return;
    }

    if (alliances.length > 0) {
        const allianceSection = document.createElement('div');
        allianceSection.innerHTML = '<h3 class="ranking-section-title">軍事同盟ブロック</h3>';
        alliances.forEach(a => {
            const stats = a.getStats();
            const div = document.createElement('div');
            div.className = 'panel';
            div.style.marginBottom = '10px';
            
            let memberNames = a.members.map(mId => {
                const n = nations.find(nat => nat.id === mId);
                return n ? `<span style="color:${n.color}">${n.name}</span>` : "不明";
            }).join(', ');

            div.innerHTML = `
                <div style="font-weight:bold; color:${a.color}; font-size:1.1em; border-bottom:1px solid #444; margin-bottom:5px; padding-bottom:3px;">${a.name}</div>
                <div style="font-size:0.9em; margin-bottom:5px;"><b>加盟国:</b> ${memberNames}</div>
                <div style="font-size:0.8em; color:#ccc;">
                    総GDP: ${formatNum(stats.gdp)} | 総人口: ${formatNum(stats.pop)} | 推定総軍事力: ${formatNum(stats.military)}
                </div>
                <div style="margin-top:10px;">
                    <div style="font-size:0.8em; color:#aaa; margin-bottom:3px;">最近の動向:</div>
                    <div style="max-height:80px; overflow-y:auto; font-size:0.75em; background:rgba(0,0,0,0.3); padding:5px;">
                        ${a.history.slice(-5).reverse().map(h => `[Y${h.year}] ${h.event}`).join('<br>')}
                    </div>
                </div>
            `;
            allianceSection.appendChild(div);
        });
        content.appendChild(allianceSection);
    }

    if (organizations.length > 0) {
        const orgSection = document.createElement('div');
        orgSection.innerHTML = '<h3 class="ranking-section-title">国際機関</h3>';
        organizations.forEach(o => {
            const div = document.createElement('div');
            div.className = 'panel';
            div.style.marginBottom = '10px';

            let memberNames = o.members.map(mId => {
                const n = nations.find(nat => nat.id === mId);
                return n ? `<span style="color:${n.color}">${n.name}</span>` : "不明";
            }).join(', ');

            div.innerHTML = `
                <div style="font-weight:bold; color:#4db8ff; font-size:1.1em; border-bottom:1px solid #444; margin-bottom:5px; padding-bottom:3px;">${o.name}</div>
                <div style="font-size:0.9em; margin-bottom:5px;"><b>加盟国 (${o.members.length}カ国):</b> ${memberNames}</div>
                <div style="font-size:0.8em; color:#ccc;">
                    目的: ${o.name === "世界貿易機構" ? "経済協力・関税撤廃" : "科学技術の共有と発展"}
                </div>
            `;
            orgSection.appendChild(div);
        });
        content.appendChild(orgSection);
    }
}

function renderRankingContent() {
    const content = document.getElementById('ranking-content');
    // Save scroll position
    const modal = document.getElementById('ranking-modal');
    const scrollTop = modal ? modal.scrollTop : 0;

    content.innerHTML = '';

    // Prepare Ranking Data (Aggregate Puppets)
    const rankingData = [];
    const activeNations = nations.filter(n => !n.isDead);

    // 1. Initialize with independent nations
    activeNations.forEach(n => {
        if (!n.isPuppet) {
            rankingData.push({
                id: n.id,
                name: n.name,
                color: n.color,
                gdp: n.gdp,
                pop: n.pop,
                military: n.getMilitaryPower(),
                tiles: n.tiles.length,
                isBloc: false
            });
        }
    });

    // 2. Add puppet stats to masters
    activeNations.forEach(n => {
        if (n.isPuppet && n.masterId !== -1) {
            const masterData = rankingData.find(d => d.id === n.masterId);
            if (masterData) {
                masterData.gdp += n.gdp;
                masterData.pop += n.pop;
                masterData.military += n.getMilitaryPower();
                masterData.tiles += n.tiles.length;
                masterData.isBloc = true;
            }
        }
    });

    // 3. Update names and calculate score
    rankingData.forEach(d => {
        if (d.isBloc) {
            d.name = `${d.name}(${d.name}圏)`;
        }
        d.score = Math.floor(d.gdp + (d.pop / 100) + (d.military * 10) + (d.tiles * 50));
    });

    const createTable = (title, list, valueFn, formatFn) => {
        const section = document.createElement('div');
        section.innerHTML = `<h3 class="ranking-section-title">${title}</h3>`;
        
        const table = document.createElement('table');
        table.className = 'ranking-table';
        
        // Header
        const thead = document.createElement('thead');
        thead.innerHTML = `<tr><th style="width:30px">#</th><th>国家名</th><th style="width: 40%;"></th><th style="text-align:right;">${title.split(' ')[0]}</th></tr>`;
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        // list is already processed rankingData
        const sorted = list.slice().sort((a, b) => valueFn(b) - valueFn(a)).slice(0, 10);
        
        const maxVal = sorted.length > 0 ? valueFn(sorted[0]) : 1;

        sorted.forEach((d, index) => {
            const tr = document.createElement('tr');
            const val = valueFn(d);
            const percent = (val / maxVal) * 100;
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td style="color:${d.color}; font-weight:bold;">${d.name}</td>
                <td>
                    <div class="rank-bar-container">
                        <div class="rank-bar" style="width: ${percent}%; background-color: ${d.color};"></div>
                    </div>
                </td>
                <td style="text-align:right;">${formatFn ? formatFn(val) : val}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        section.appendChild(table);
        return section;
    };

    // 0. Total Score
    content.appendChild(createTable('総合国力スコア', rankingData, d => d.score, val => formatNum(val)));

    // 1. GDP
    content.appendChild(createTable('GDP (経済力)', rankingData, d => d.gdp, val => formatNum(val)));
    
    // 2. Population
    content.appendChild(createTable('人口', rankingData, d => d.pop, val => formatNum(val)));
    
    // 3. Military Power
    content.appendChild(createTable('軍事力 (推定)', rankingData, d => Math.floor(d.military), val => formatNum(val)));
    
    // 4. Territory (Tiles)
    content.appendChild(createTable('領土面積 (タイル数)', rankingData, d => d.tiles, val => val));

    // Restore scroll position
    if (modal) modal.scrollTop = scrollTop;
}

/**
 * 描画モードの処理
 */
function handleDraw(e) {
    if (!mousePressed || (!isDrawing && !isTerrainEditMode)) return;
    
    const {x, y} = getGridPos(e);

    if (x >= 0 && x < width && y >= 0 && y < height) {
        const targetType = (e.type.startsWith('touch') || mouseButton === 0) ? currentBrush : (currentBrush === 1 ? 0 : 1);
        
        if (isFillMode) {
            // 塗りつぶし（クリックした瞬間のみ実行したいが、mousedownでも呼ばれるのでOK）
            // mousemove中に塗りつぶしを連打すると重いので、mousedownの時だけにする工夫が必要
            if (e.type === 'mousedown' || e.type === 'touchstart') {
                floodFill(x, y, targetType);
            }
        } else {
            // ブラシサイズ（少し太く）
            for(let dy=-1; dy<=1; dy++){
                for(let dx=-1; dx<=1; dx++){
                    const nx = x+dx;
                    const ny = y+dy;
                    if(nx>=0 && nx<width && ny>=0 && ny<height){
                        const idx = ny * width + nx;
                        applyTileChange(idx, targetType);
                    }
                }
            }
        }
    }
}

function updateMilitaryGrid() {
    // ターゲット密度マップの作成
    let targetGrid = new Array(width * height).fill(0);

    nations.forEach(n => {
        if (n.isDead) return;

        // 軍事力に応じた総軍事ポイント
        let totalMilPoints = n.getMilitaryPower() / 1000; // スケール調整
        if (totalMilPoints <= 0) return;

        // 重点地区の特定
        let hotSpots = [];

        // 1. 最前線 (交戦中の国と接しているタイル)
        if (n.atWarWith.length > 0) {
            n.tiles.forEach(tIdx => {
                const cx = tIdx % width;
                const cy = Math.floor(tIdx / width);
                let isFrontline = false;
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const neighborOwner = ownerGrid[ny * width + nx];
                        if (n.atWarWith.includes(neighborOwner)) {
                            isFrontline = true;
                        }
                    }
                });
                if (isFrontline) {
                    hotSpots.push({ idx: tIdx, weight: 10 });
                }
            });
        }

        // 2. 都市 (防衛拠点)
        n.cities.forEach((city, idx) => {
            hotSpots.push({ idx: city.tileIdx, weight: idx === 0 ? 15 : 5 });
        });

        // 重点地区がない場合は首都またはランダムな領土を拠点にする
        if (hotSpots.length === 0) {
            if (n.cities.length > 0) {
                hotSpots.push({ idx: n.cities[0].tileIdx, weight: 1 });
            } else if (n.tiles.length > 0) {
                hotSpots.push({ idx: n.tiles[Math.floor(Math.random() * n.tiles.length)], weight: 1 });
            }
        }

        // ポイントの配分
        let totalWeight = hotSpots.reduce((sum, s) => sum + s.weight, 0);
        hotSpots.forEach(s => {
            const points = (s.weight / totalWeight) * totalMilPoints;
            // 周囲に拡散
            const cx = s.idx % width;
            const cy = Math.floor(s.idx / width);
            const range = 3;
            for (let dy = -range; dy <= range; dy++) {
                for (let dx = -range; dx <= range; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const falloff = Math.max(0, 1 - dist / (range + 1));
                        targetGrid[ny * width + nx] += points * falloff;
                    }
                }
            }
        });
    });

    // 現在のグリッドをターゲットへ近づける (スムーズな移動)
    for (let i = 0; i < militaryGrid.length; i++) {
        const current = militaryGrid[i];
        const target = targetGrid[i];
        // 変化速度
        militaryGrid[i] = current + (target - current) * 0.1;
        // 減衰 (所有者がいない場合など)
        if (ownerGrid[i] === -1) {
            militaryGrid[i] *= 0.9;
        }
        if (militaryGrid[i] < 0.01) militaryGrid[i] = 0;
    }
}

function floodFill(startX, startY, newType) {
    const oldType = grid[startY * width + startX];
    if (oldType === newType) return;

    const stack = [[startX, startY]];
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const idx = y * width + x;

        if (grid[idx] === oldType) {
            applyTileChange(idx, newType);

            if (x > 0) stack.push([x - 1, y]);
            if (x < width - 1) stack.push([x + 1, y]);
            if (y > 0) stack.push([x, y - 1]);
            if (y < height - 1) stack.push([x, y + 1]);
        }
    }
}

/**
 * 選択とホバー
 */
function handleSelect(e) {
    if (isDrawing || isTerrainEditMode) return;
    const {x, y} = getGridPos(e);
    if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = y * width + x;
        const owner = ownerGrid[idx];
        if (owner !== -1) {
            selectedNationId = owner;
            updateNationPanel();
            document.getElementById('nation-panel').style.display = 'block';
        } else {
            document.getElementById('nation-panel').style.display = 'none';
            selectedNationId = -1;
        }
    }
}

function handleHover(e) {
    const hoverInfo = document.getElementById('hover-info');
    if (isDrawing || isTerrainEditMode) {
        hoverInfo.style.display = 'none';
        return;
    }
    
    const {x, y} = getGridPos(e);
    if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = y * width + x;
        const owner = ownerGrid[idx];
        if (owner !== -1) {
            const n = nations.find(nat => nat.id === owner);
            if(n) {
                const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                hoverInfo.style.display = 'block';
                hoverInfo.style.left = (clientX + 10) + 'px';
                hoverInfo.style.top = (clientY + 10) + 'px';
                hoverInfo.innerHTML = `<b>${n.name}</b><br>人口: ${formatNum(n.pop)}`;
                return;
            }
        }
    }
    hoverInfo.style.display = 'none';
}

function applyTileChange(idx, targetType) {
    const oldType = grid[idx];
    if (oldType === targetType) return;

    grid[idx] = targetType;
    mapDirty = true;

    // Handle terrain change logic during simulation (or any time owner exists)
    if (targetType === 0) { // To Water
        const ownerId = ownerGrid[idx];
        if (ownerId !== -1) {
            const nation = nations.find(n => n.id === ownerId);
            if (nation) {
                // Remove from tiles array
                nation.tiles = nation.tiles.filter(t => t !== idx);
                // Remove city if exists on this tile
                nation.cities = nation.cities.filter(c => c.tileIdx !== idx);
            }
            ownerGrid[idx] = -1;
        }
        elevationGrid[idx] = 0;
        militaryGrid[idx] = 0;
    } else if (oldType === 0) { // From Water to Land/Mountain/River
        elevationGrid[idx] = 0.5;
    }
}

function getGridPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    
    const relX = clientX - rect.left - canvas.width/2;
    const relY = clientY - rect.top - canvas.height/2;
    const x = Math.floor((relX / mapScale + (width*TILE_SIZE)/2) / TILE_SIZE);
    const y = Math.floor((relY / mapScale + (height*TILE_SIZE)/2) / TILE_SIZE);
    return {x, y};
}

/**
 * ワールド生成ロジック
 */
function generateWorld() {
    isDrawing = false;
    isTerrainEditMode = false;
    document.getElementById('btn-terrain-edit').innerText = '🛠 地形編集: オフ';
    document.getElementById('btn-terrain-edit').style.background = '#d35400';
    document.getElementById('sim-edit-tools').style.display = 'none';

    document.getElementById('menu-panel').style.display = 'none';
    document.getElementById('sim-panel').style.display = 'block';

    activeScenario = currentScenario;
    isDemocracyAwakened = (activeScenario === 'TOTALLER_KRIEG' || activeScenario === 'GRACEFUL_US');
    isSocialismSprouted = (activeScenario === 'TOTALLER_KRIEG' || activeScenario === 'GRACEFUL_US');

    // 1. 地形補正 (山と川)
    generateTerrainFeatures();

    // 2. 国家生成
    spawnNations();
    
    // 3. 大陸情報の更新
    updateContinents();

    log("世界が生成されました。歴史が始まります。", "log-info");
}

function generateTerrainFeatures() {
    // 1. 標高マップの生成 (距離 + ノイズ)
    let distMap = new Array(width * height).fill(width * height);
    
    // パス1: 左上から右下へ
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = y * width + x;
            if (grid[idx] === 0) {
                distMap[idx] = 0;
            } else {
                let left = (x > 0) ? distMap[idx - 1] : width * height;
                let top = (y > 0) ? distMap[idx - width] : width * height;
                distMap[idx] = Math.min(distMap[idx], Math.min(left, top) + 1);
            }
        }
    }
    // パス2: 右下から左上へ
    for (let y = height - 1; y >= 0; y--) {
        for (let x = width - 1; x >= 0; x--) {
            let idx = y * width + x;
            if (grid[idx] !== 0) {
                let right = (x < width - 1) ? distMap[idx + 1] : width * height;
                let bottom = (y < height - 1) ? distMap[idx + width] : width * height;
                distMap[idx] = Math.min(distMap[idx], Math.min(right, bottom) + 1);
            }
        }
    }

    let maxDist = 0;
    for(let i=0; i<width*height; i++) if(distMap[i] > maxDist) maxDist = distMap[i];
    if(maxDist === 0) maxDist = 1;

    const noiseScale = 0.05; // Adjust for map size
    const seedX = Math.random() * 1000;
    const seedY = Math.random() * 1000;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (grid[idx] === 0) {
                elevationGrid[idx] = 0;
            } else {
                // Base elevation from distance (conical islands)
                let base = distMap[idx] / maxDist;
                
                // Add noise
                let nVal = fbm(x * noiseScale + seedX, y * noiseScale + seedY, 3);
                // Normalize noise roughly to 0-1
                nVal = (nVal + 1) / 2;
                
                // Mix: 60% distance, 40% noise
                elevationGrid[idx] = base * 0.6 + nVal * 0.4;
            }
        }
    }

    // 2. 山脈の生成 (高標高地点)
    // 標高の上位X%を山にする
    let landIndices = [];
    for(let i=0; i<width*height; i++) if(grid[i] !== 0) landIndices.push(i);
    landIndices.sort((a,b) => elevationGrid[b] - elevationGrid[a]);
    
    // Top 10% -> Mountain
    const mountainCount = Math.floor(landIndices.length * 0.1);
    for(let i=0; i<mountainCount; i++) {
        grid[landIndices[i]] = 2; // Mountain
    }

    // 3. 河川の生成 (水理侵食シミュレーション)
    let flowMap = new Array(width * height).fill(0);
    const drops = Math.floor(landIndices.length * 2.0); // Raindrops

    for (let i = 0; i < drops; i++) {
        // Random start point (weighted by elevation?) or just random land
        // Higher elevation is more likely to start a river
        let startIdx = landIndices[Math.floor(Math.random() * (landIndices.length / 2))]; // Top 50% elevation
        
        let cx = startIdx % width;
        let cy = Math.floor(startIdx / width);
        let currIdx = startIdx;
        let path = [];
        
        while (true) {
            path.push(currIdx);
            flowMap[currIdx]++;
            
            // Find lowest neighbor
            let lowestIdx = -1;
            let minH = elevationGrid[currIdx];
            
            // 8 neighbors for better flow
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        // Determine height: if water, height is -1 (flows into sea)
                        let h = (grid[nIdx] === 0) ? -1 : elevationGrid[nIdx];
                        
                        if (h < minH) {
                            minH = h;
                            lowestIdx = nIdx;
                        }
                    }
                }
            }
            
            if (lowestIdx === -1) {
                // Local minimum (lake?), stop
                break;
            }
            
            if (grid[lowestIdx] === 0) {
                // Reached sea
                break; 
            }
            
            currIdx = lowestIdx;
            cx = currIdx % width;
            cy = Math.floor(currIdx / width);
            
            if (path.length > 200) break; // Infinite loop safety
        }
    }

    // Assign Rivers based on flow
    // Normalize flow?
    // Thresholds:
    // Flow > 20 -> Major River
    // Flow > 5 -> River
    
    // Scale thresholds by map size/raindrops
    // Average flow?
    
    for (let i = 0; i < width * height; i++) {
        if (grid[i] === 0 || grid[i] === 2) continue; // Skip water and mountains (mountains can have rivers start, but usually stay mountains)
        
        if (flowMap[i] > 200) {
            grid[i] = 4; // Major River
        } else if (flowMap[i] > 20) {
            grid[i] = 3; // River
        }
    }
}

/**
 * 同盟クラス
 */
class Alliance {
    constructor(id, name, leaderId, color) {
        this.id = id;
        this.name = name;
        this.leaderId = leaderId;
        this.members = [leaderId];
        this.color = color || `hsl(${Math.random()*360}, 80%, 60%)`;
        this.history = [];
        this.visualCentroid = {x: 0, y: 0};
        this.visualAngle = 0;
        this.largestComponentSize = 0;
        this.addHistory(`同盟「${name}」が結成されました。`);
    }

    addHistory(event) {
        this.history.push({ year: year, event: event });
    }

    updateCentroid() {
        let allTiles = [];
        this.members.forEach(mId => {
            const n = nations.find(nat => nat.id === mId);
            if (n && !n.isDead) {
                allTiles = allTiles.concat(n.tiles);
            }
        });

        if (allTiles.length === 0) {
            this.visualCentroid = {x: 0, y: 0};
            this.visualAngle = 0;
            this.largestComponentSize = 0;
            return;
        }

        // Find largest component among ALL tiles of the alliance
        const tileSet = new Set(allTiles);
        const visited = new Set();
        let largestComponent = [];

        for (const startIdx of allTiles) {
            if (visited.has(startIdx)) continue;
            const component = [];
            const stack = [startIdx];
            visited.add(startIdx);
            while (stack.length > 0) {
                const currIdx = stack.pop();
                component.push(currIdx);
                const cx = currIdx % width, cy = Math.floor(currIdx / width);
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        if (tileSet.has(nIdx) && !visited.has(nIdx)) {
                            visited.add(nIdx);
                            stack.push(nIdx);
                        }
                    }
                });
            }
            if (component.length > largestComponent.length) largestComponent = component;
        }

        this.largestComponentSize = largestComponent.length;
        if (largestComponent.length > 0) {
            let vSumX = 0, vSumY = 0;
            for (const idx of largestComponent) {
                vSumX += idx % width; vSumY += Math.floor(idx / width);
            }
            this.visualCentroid.x = vSumX / largestComponent.length;
            this.visualCentroid.y = vSumY / largestComponent.length;
            let varX = 0, varY = 0, covXY = 0;
            for (const idx of largestComponent) {
                const x = idx % width, y = Math.floor(idx / width);
                const dx = x - this.visualCentroid.x, dy = y - this.visualCentroid.y;
                varX += dx * dx; varY += dy * dy; covXY += dx * dy;
            }
            let angle = 0.5 * Math.atan2(2 * covXY, varX - varY);
            const maxRad = 70 * Math.PI / 180;
            this.visualAngle = Math.max(-maxRad, Math.min(maxRad, angle));
        }
    }

    getStats() {
        let totalGdp = 0;
        let totalPop = 0;
        let totalMil = 0;
        this.members.forEach(mId => {
            const m = nations.find(n => n.id === mId);
            if (m && !m.isDead) {
                totalGdp += m.gdp;
                totalPop += m.pop;
                totalMil += m.getMilitaryPower();
            }
        });
        return { gdp: totalGdp, pop: totalPop, military: totalMil };
    }
}

/**
 * 国際機関クラス
 */
class InternationalOrganization {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.members = []; // Array of nation IDs
    }
}

/**
 * 都市クラス
 */
class City {
    constructor(name, tileIdx, nationId) {
        this.name = name;
        this.tileIdx = tileIdx;
        this.nationId = nationId;
        this.unrest = 0;
        this.partySupport = {}; // { "PartyName": 0-100 }
    }
}

/**
 * 国家クラス
 */
class Nation {
    constructor(id, x, y) {
        this.id = (id !== undefined) ? id : nationIdCounter++;
        this.color = `hsl(${Math.random()*360}, 70%, 50%)`;
        this.cultureType = Math.random() < 0.15 ? 'KANJI' : 'ALPHABET';
        this.baseName = this.generateBaseName();
        this.regimeNumber = 1;
        this.religion = RELIGIONS[Math.floor(Math.random() * RELIGIONS.length)];
        
        // Stats
        this.pop = 1000 + Math.floor(Math.random() * 5000);
        this.gdp = 100 + Math.floor(Math.random() * 900); // 1人あたりではない、国力ベース
        this.industry = 10 + Math.floor(Math.random() * 50);
        this.tech = 0; // Index of TECH_LEVELS
        
        // Politics
        const system = generatePoliticalSystem(this.tech);
        this.sysBroad = system.sysBroad;
        this.sysDetailed = system.sysDetailed;
        this.sovereign = system.sovereign;
        this.stateStruct = system.stateStruct;
        this.ecoIdeology = system.ecoIdeology;
        
        this.govType = this.sysDetailed; // Backward compatibility

        // Grand Empire Logic (Rare Spawn)
        this.isGrandEmpire = false;
        if (Math.random() < 0.01) {
            this.isGrandEmpire = true;
            this.sysBroad = '権威主義';
            this.sysDetailed = '絶対君主制';
            this.sovereign = '君主';
            this.govType = this.sysDetailed;
            
            // Boost stats (Monster Buff)
            this.pop = Math.floor(this.pop * 5.0);
            this.gdp = Math.floor(this.gdp * 10.0);
            this.tech = 3; // Modern
            this.color = `hsl(${Math.random()*360}, 100%, 30%)`; // Darker, more intense color
        }

        this.updateName();
        this.stability = 100;
        this.governance = (this.sysBroad === '民主主義' ? 60 : (this.sysBroad === '全体主義' ? 70 : 50)) + (this.tech * 5);
        this.unrest = 0;
        this.leader = this.generateLeaderName();
        
        // Military
        const soldierRatio = this.isGrandEmpire ? 0.5 : 0.1;
        this.soldiers = Math.floor(this.pop * soldierRatio);
        this.soldierQuality = (0.5 + Math.random()) + (this.isGrandEmpire ? 2.0 : 0);
        this.equipQuality = 0.5 + Math.random();
        this.tanks = this.isGrandEmpire ? 100 : 0;
        this.ships = this.isGrandEmpire ? 50 : 0;
        
        // Diplomacy
        this.relations = {}; // { nationId: value (-100 to 100) }
        this.atWarWith = []; // list of nation IDs
        this.centroid = {x: 0, y: 0};
        this.visualCentroid = {x: 0, y: 0};
        this.visualAngle = 0;
        this.largestComponentSize = 0;
        this.isDead = false;
        this.isRebel = false;
        this.parentName = "";
        this.rebellionCooldown = 0;
        this.isPuppet = false;
        this.masterId = -1;
        this.puppetSince = 0;
        this.allies = []; // List of allied nation IDs (legacy, kept for logic)
        this.allianceId = -1;
        this.organizationIds = [];
        
        this.cities = [];
        this.history = [];
        this.supportHistory = [];
        this.partySystem = Math.random() < 0.4 ? 'TWO_PARTY' : 'MULTI_PARTY';

        if (this.sysBroad === '民主主義') {
            this.generateParties();
        }

        // 初期領土
        if (x !== undefined && y !== undefined) {
            const tileIdx = y * width + x;
            ownerGrid[tileIdx] = this.id;
            this.tiles = [tileIdx];
            // 初期都市（首都）の生成
            this.cities.push(new City(this.baseName + "府", tileIdx, this.id));
            this.addHistory("建国 (Founded)");
        } else {
            this.tiles = [];
        }
    }

    addHistory(event) {
        this.history.push({ year: year, event: event });
    }

    generateBaseName() {
        if (this.cultureType === 'KANJI') {
            for(let i=0; i<100; i++) {
                const len = Math.random() < 0.8 ? 2 : 3;
                let name = "";
                for(let j=0; j<len; j++) name += KANJI_CHARS[Math.floor(Math.random()*KANJI_CHARS.length)];
                if (!isBaseNameTaken(name, this.id)) return name;
            }
            return KANJI_CHARS[Math.floor(Math.random()*KANJI_CHARS.length)] + KANJI_CHARS[Math.floor(Math.random()*KANJI_CHARS.length)] + Math.floor(Math.random()*100);
        } else {
            const syl = ["アル", "バン", "シー", "ドル", "エル", "ファ", "ゴル", "ハン", "イル", "ジョ", "カ", "ロル", "ミ", "ノル", "パ", "ク", "ロ", "サ", "ティ", "ウル", "ヴァ", "キ", "ズ"];
            for(let i=0; i<100; i++) {
                let name = syl[Math.floor(Math.random()*syl.length)] + syl[Math.floor(Math.random()*syl.length)];
                if (!isBaseNameTaken(name, this.id)) return name;
            }
            return syl[Math.floor(Math.random()*syl.length)] + syl[Math.floor(Math.random()*syl.length)] + Math.floor(Math.random()*100);
        }
    }

    generateCityName() {
        if (this.cultureType === 'KANJI') {
            const suffix = ["市", "京", "都", "府", "港", "宿", "町"];
            for(let i=0; i<100; i++) {
                let name = KANJI_CHARS[Math.floor(Math.random()*KANJI_CHARS.length)] + KANJI_CHARS[Math.floor(Math.random()*KANJI_CHARS.length)] + suffix[Math.floor(Math.random()*suffix.length)];
                if (!isCityNameTaken(name)) return name;
            }
            return KANJI_CHARS[Math.floor(Math.random()*KANJI_CHARS.length)] + "市" + Math.floor(Math.random()*100);
        } else {
            const syl = ["アル", "バン", "シー", "ドル", "エル", "ファ", "ゴル", "ハン", "イル", "ジョ", "カ", "ロル", "ミ", "ノル", "パ", "ク", "ロ", "サ", "ティ", "ウル", "ヴァ", "キ", "ズ"];
            const suffix = ["市", "府", "京", "要塞", "港", "都"];
            for(let i=0; i<100; i++) {
                let name = syl[Math.floor(Math.random()*syl.length)] + syl[Math.floor(Math.random()*syl.length)] + suffix[Math.floor(Math.random()*suffix.length)];
                if (!isCityNameTaken(name)) return name;
            }
            return syl[Math.floor(Math.random()*syl.length)] + syl[Math.floor(Math.random()*syl.length)] + suffix[Math.floor(Math.random()*suffix.length)] + Math.floor(Math.random()*100);
        }
    }

    updateName() {
        const nameInfo = getNationSuffix(this);
        let proposedName = nameInfo.prefix + this.baseName + nameInfo.suffix;

        // Ensure uniqueness
        if (!isNationNameTaken(proposedName, this.id)) {
            this.name = proposedName;
        } else {
            // Check if we should use "Nth Regime" numbering
            const isDemocracy = this.sysBroad === '民主主義';
            
            if (isDemocracy) {
                let baseString = proposedName;
                let startNum = 2;
                
                // Check if already ends in "第N政"
                const match = proposedName.match(/第(\d+)政$/);
                if (match) {
                    baseString = proposedName.substring(0, match.index);
                    startNum = parseInt(match[1]) + 1;
                }

                let finalName = proposedName;
                let counter = startNum;
                
                while (true) {
                    let nextName = baseString + "第" + counter + "政";
                    if (!isNationNameTaken(nextName, this.id)) {
                        finalName = nextName;
                        break;
                    }
                    counter++;
                    if (counter > 1000) {
                        finalName = proposedName + Math.floor(Math.random() * 1000);
                        break;
                    }
                }
                this.name = finalName;
            } else {
                let counter = 2;
                let finalName = proposedName;
                while (true) {
                    let nextName = proposedName + " (" + counter + ")";
                    if (!isNationNameTaken(nextName, this.id)) {
                        finalName = nextName;
                        break;
                    }
                    counter++;
                    if (counter > 100) { 
                        finalName = proposedName + Math.floor(Math.random() * 1000);
                        break;
                    }
                }
                this.name = finalName;
            }
        }

        if (!this.isPuppet) {
            nations.forEach(n => {
                if (n.isPuppet && n.masterId === this.id) {
                    n.updateName();
                }
            });
        }
    }

    generateLeaderName() {
        const first = ["ヨハン", "フリードリヒ", "ルイ", "チャールズ", "アレクサンダー", "ニコライ", "マリア", "エリザベス", "ヴィクトリア", "カトリーヌ", "スレイマン", "カンヒ", "メイジ", "グスタフ", "カメハメハ"];
        const last = ["世", "大王", "公", "卿", "・ボナパルト", "・ロマノフ", "・ハプスブルク", "・ブルボン", "・テューダー", "・ホーエンツォレルン"];
        if (Math.random() < 0.7) {
            return first[Math.floor(Math.random() * first.length)] + (Math.random() < 0.5 ? last[Math.floor(Math.random() * last.length)] : "");
        } else {
            // 日本風
            const jpFirst = ["織田", "豊臣", "徳川", "武田", "上杉", "毛利", "島津", "伊達"];
            const jpLast = ["信長", "秀吉", "家康", "信玄", "謙信", "元就", "義久", "政宗"];
            return jpFirst[Math.floor(Math.random() * jpFirst.length)] + jpLast[Math.floor(Math.random() * jpLast.length)];
        }
    }

    generateParties() {
        this.parties = [];
        this.parliamentSize = 100;
        
        const colors = ['#3498db', '#e74c3c', '#f1c40f', '#2ecc71', '#9b59b6', '#34495e', '#e67e22', '#1abc9c'];
        colors.sort(() => Math.random() - 0.5);
        
        if (this.partySystem === 'TWO_PARTY') {
            // Two major parties
            const supportA = 40 + Math.random() * 15;
            const supportB = 35 + Math.random() * 15;
            const supportC = Math.max(0, 100 - supportA - supportB);
            
            const kanjiNames = ['自由党', '民主党', '共和党', '国民党'];
            const alphaNames = ['Liberals', 'Democrats', 'Republicans', 'Nationals'];
            
            const pool = this.cultureType === 'KANJI' ? [...kanjiNames] : [...alphaNames];
            
            const nameA = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
            const nameB = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
            
            this.parties.push({ name: nameA, color: colors[0], support: supportA, seats: Math.round(supportA), ideology: 'Major' });
            this.parties.push({ name: nameB, color: colors[1], support: supportB, seats: Math.round(supportB), ideology: 'Major' });
            
            if (supportC > 0) {
                 this.parties.push({ name: (this.cultureType === 'KANJI' ? '諸派' : 'Others'), color: '#95a5a6', support: supportC, seats: Math.round(supportC), ideology: 'Minor' });
            }
        } else {
            // Multi-Party System
            const numParties = 3 + Math.floor(Math.random() * 3); // 3 to 5
            let remainingSupport = 100;
            
            const kanjiNames = ['自由党', '社会党', '国民党', '民主党', '未来党', '改革党', '平和党', '環境党', '保守党'];
            const alphaNames = ['Liberal Party', 'Socialists', 'National Party', 'Democrats', 'Future Party', 'Reform Party', 'Peace Party', 'Green Party', 'Conservatives'];
            
            const pool = this.cultureType === 'KANJI' ? [...kanjiNames] : [...alphaNames];

            for (let i = 0; i < numParties; i++) {
                if (pool.length === 0) break;
                
                let share;
                if (i === numParties - 1) {
                    share = remainingSupport;
                } else {
                    share = (Math.random() * (remainingSupport / 1.5)) + 5; 
                }
                remainingSupport -= share;
                
                const name = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                this.parties.push({ 
                    name: name, 
                    color: colors[i % colors.length], 
                    support: share, 
                    seats: Math.round(share),
                    ideology: 'Generic' 
                });
            }
        }
        
        // Normalize seats to 100
        let totalSeats = this.parties.reduce((sum, p) => sum + p.seats, 0);
        if (totalSeats !== 100) {
            // Adjust largest party
            const largest = this.parties.reduce((prev, curr) => prev.seats > curr.seats ? prev : curr);
            largest.seats += (100 - totalSeats);
        }
    }

    getMilitaryPower() {
        // 軍事力計算式: 兵数 * 質 * 装備 * (戦車ボーナス)
        let tankBonus = 1 + (this.tanks * 0.05);
        let base = this.soldiers * this.soldierQuality * this.equipQuality * tankBonus * (1 + this.tech * 0.5);
        if (this.isGrandEmpire) base *= 5.0; // Monster buff
        return base;
    }

    getNavalPower() {
        return this.ships * (1 + this.tech * 0.5) * this.equipQuality;
    }

    updateCentroid() {
        if (this.tiles.length === 0) {
            this.centroid = {x: 0, y: 0};
            this.visualCentroid = {x: 0, y: 0};
            this.visualAngle = 0;
            this.largestComponentSize = 0;
            return;
        }

        // Standard centroid (average of all tiles)
        let sumX = 0, sumY = 0;
        for (let i = 0; i < this.tiles.length; i++) {
            const tileIdx = this.tiles[i];
            sumX += tileIdx % width;
            sumY += Math.floor(tileIdx / width);
        }
        this.centroid.x = sumX / this.tiles.length;
        this.centroid.y = sumY / this.tiles.length;

        // Find connected components to find the largest landmass
        const tileSet = new Set(this.tiles);
        const visited = new Set();
        let largestComponent = [];

        for (const startIdx of this.tiles) {
            if (visited.has(startIdx)) continue;

            const component = [];
            const stack = [startIdx];
            visited.add(startIdx);

            while (stack.length > 0) {
                const currIdx = stack.pop();
                component.push(currIdx);

                const cx = currIdx % width;
                const cy = Math.floor(currIdx / width);

                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        if (tileSet.has(nIdx) && !visited.has(nIdx)) {
                            visited.add(nIdx);
                            stack.push(nIdx);
                        }
                    }
                });
            }

            if (component.length > largestComponent.length) {
                largestComponent = component;
            }
        }

        this.largestComponentSize = largestComponent.length;

        if (largestComponent.length > 0) {
            // Visual Centroid
            let vSumX = 0, vSumY = 0;
            for (const idx of largestComponent) {
                vSumX += idx % width;
                vSumY += Math.floor(idx / width);
            }
            this.visualCentroid.x = vSumX / largestComponent.length;
            this.visualCentroid.y = vSumY / largestComponent.length;

            // Visual Angle using PCA
            let varX = 0, varY = 0, covXY = 0;
            for (const idx of largestComponent) {
                const x = idx % width;
                const y = Math.floor(idx / width);
                const dx = x - this.visualCentroid.x;
                const dy = y - this.visualCentroid.y;
                varX += dx * dx;
                varY += dy * dy;
                covXY += dx * dy;
            }
            
            let angle = 0.5 * Math.atan2(2 * covXY, varX - varY);
            
            // Clamp to +/- 70 degrees (approximately 1.22 radians)
            const maxRad = 70 * Math.PI / 180;
            this.visualAngle = Math.max(-maxRad, Math.min(maxRad, angle));
        } else {
            this.visualCentroid = { ...this.centroid };
            this.visualAngle = 0;
        }
    }

    isCoastal() {
        // 少なくとも1つのタイルが海(0)に接しているか (サンプリング)
        const samples = Math.min(this.tiles.length, 30);
        for(let i=0; i<samples; i++) {
            let tile = this.tiles[Math.floor(Math.random() * this.tiles.length)];
            let cx = tile % width;
            let cy = Math.floor(tile / width);
            let found = false;
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
                let nx=cx+dx, ny=cy+dy;
                if(nx>=0 && nx<width && ny>=0 && ny<height) {
                    if(grid[ny*width+nx] === 0) found = true;
                }
            });
            if(found) return true;
        }
        return false;
    }

    isSocialist() {
        return (this.sysDetailed === '前衛党独裁' || (this.ecoIdeology && (this.ecoIdeology.includes('計画') || this.ecoIdeology.includes('統制')) && this.sysBroad === '全体主義'));
    }
}

function spawnNations() {
    let landTiles = [];
    for(let i=0; i<grid.length; i++) {
        if(grid[i] === 1) landTiles.push(i);
    }

    nationIdCounter = 0;

    if (activeScenario === 'TOTALLER_KRIEG') {
        if (landTiles.length === 0) return;

        // 1. Find Center Tile for Axis
        let centerX = width / 2;
        let centerY = height / 2;
        let axisTile = -1;
        let minDist = Infinity;

        landTiles.forEach(t => {
            let x = t % width;
            let y = Math.floor(t / width);
            let d = (x - centerX)**2 + (y - centerY)**2;
            if (d < minDist) {
                minDist = d;
                axisTile = t;
            }
        });

        // 2. Create Axis
        const axis = new Nation(undefined, axisTile % width, Math.floor(axisTile / width));
        axis.name = "枢軸国";
        axis.color = "#800000"; // Dark Red
        axis.sysBroad = "全体主義";
        axis.sysDetailed = "軍事独裁制";
        axis.sovereign = "独裁者";
        axis.govType = "軍事独裁制";
        axis.tech = 4; // Futuristic
        axis.pop = 50000000;
        axis.gdp = 10000000;
        axis.soldiers = 2000000; // Strong initial army
        axis.tanks = 2000;
        axis.ships = 100;
        axis.stability = 100;
        axis.isGrandEmpire = true;
        
        // Give Axis a head start in territory (Radius 12)
        const axisRadius = 12;
        const axisCenterY = Math.floor(axisTile / width);
        const axisCenterX = axisTile % width;
        
        for(let dy = -axisRadius; dy <= axisRadius; dy++) {
            for(let dx = -axisRadius; dx <= axisRadius; dx++) {
                if(dx*dx + dy*dy <= axisRadius*axisRadius) {
                    let nx = axisCenterX + dx;
                    let ny = axisCenterY + dy;
                    if(nx>=0 && nx<width && ny>=0 && ny<height) {
                        let idx = ny*width + nx;
                        if(grid[idx] !== 0 && ownerGrid[idx] === -1) {
                            ownerGrid[idx] = axis.id;
                            axis.tiles.push(idx);
                        }
                    }
                }
            }
        }
        
        // Generate cities for Axis
        const axisNumCities = Math.max(5, Math.floor(axis.tiles.length / 50));
        for(let k=0; k<axisNumCities; k++) {
             if(axis.tiles.length === 0) break;
             const t = axis.tiles[Math.floor(Math.random() * axis.tiles.length)];
             const tooClose = axis.cities.some(c => getDistSq(c.tileIdx, t) < 100);
             if (!tooClose) {
                 const cityName = axis.generateCityName();
                 axis.cities.push(new City(cityName, t, axis.id));
             }
        }
        
        // Remove used tiles from landTiles
        landTiles = landTiles.filter(t => ownerGrid[t] === -1);
        nations.push(axis);

        // 3. Create Ally
        if (landTiles.length > 0) {
             let rndIdx = Math.floor(Math.random() * landTiles.length);
             let tileIdx = landTiles[rndIdx];
             // Do not remove from landTiles yet, as we will iterate
             
             const ally = new Nation(undefined, tileIdx % width, Math.floor(tileIdx / width));
             ally.name = "連合国";
             ally.sysBroad = "民主主義";
             ally.sysDetailed = "議院内閣制";
             ally.generateParties();
             ally.tech = 3; 
             ally.color = "#00008b"; // Dark Blue
             
             // Massive stats for massive nation
             ally.pop = 100000000;
             ally.gdp = 20000000;
             ally.soldiers = 5000000;
             
             // Assign all remaining land tiles
             landTiles.forEach(t => {
                 if (ownerGrid[t] === -1) {
                     ownerGrid[t] = ally.id;
                     ally.tiles.push(t);
                 }
             });
             
             // Generate cities for the Ally (otherwise it's empty)
             const numCities = Math.max(10, Math.floor(ally.tiles.length / 50));
             for(let k=0; k<numCities; k++) {
                 if(ally.tiles.length === 0) break;
                 const t = ally.tiles[Math.floor(Math.random() * ally.tiles.length)];
                 const tooClose = ally.cities.some(c => getDistSq(c.tileIdx, t) < 100);
                 if (!tooClose) {
                     const cityName = ally.generateCityName();
                     ally.cities.push(new City(cityName, t, ally.id));
                 }
             }
             
             nations.push(ally);
             
             // 5. Diplomacy Setup
             declareWar(ally, axis);
             ally.relations[axis.id] = -100;
             axis.relations[ally.id] = -100;
        }
        
        // Force update centroid for war lines
        nations.forEach(n => n.updateCentroid());

        // Log
        log("徹底抗戦シナリオ開始: 全世界が枢軸帝国に対し宣戦を布告しました。", "log-war");
        
        return;
    } else if (activeScenario === 'GRACEFUL_US') {
        if (landTiles.length === 0) return;
        
        // Create One Massive Nation
        const us = new Nation(undefined, undefined, undefined); // No initial spawn tile yet
        us.name = "アメリカ合衆国";
        us.baseName = "アメリカ";
        us.color = "#3498db"; // Blue
        us.sysBroad = "民主主義";
        us.sysDetailed = "大統領制";
        us.sovereign = "国民";
        us.stateStruct = "連邦国家";
        us.ecoIdeology = "混合経済";
        us.govType = "大統領制";
        us.tech = 3; // Modern
        us.pop = 330000000;
        us.gdp = 23000000;
        us.soldiers = 1000000;
        us.stability = 80;
        
        // Initialize Domestic Politics
        us.parties = [
            { 
                name: "民主党", 
                color: "#3498db", 
                support: 48, 
                seats: 0, 
                ideology: "リベラル",
                stats: { stab: 0.1, tech: 0.05, gdp: 0.01, mil: -0.05 } 
            },
            { 
                name: "共和党", 
                color: "#e74c3c", 
                support: 46, 
                seats: 0, 
                ideology: "保守",
                stats: { stab: 0, tech: 0, gdp: 0.05, mil: 0.1 } 
            },
            { 
                name: "リバタリアン党", 
                color: "#f1c40f", 
                support: 6, 
                seats: 0, 
                ideology: "自由至上主義",
                stats: { stab: -0.2, tech: 0.1, gdp: 0.1, mil: -0.1 } 
            }
        ];
        us.parliamentSize = 535;
        
        // Calculate initial seats
        let remaining = us.parliamentSize;
        us.parties.forEach(p => {
            let s = Math.floor((p.support / 100) * us.parliamentSize);
            p.seats = s;
            remaining -= s;
        });
        // Adjust for remainder (give to largest)
        let largest = us.parties.reduce((prev, curr) => prev.support > curr.support ? prev : curr);
        largest.seats += remaining;

        us.president = { 
            name: "ジョン・ドウ", 
            ideology: "リベラル", 
            term: 1,
            approval: 55,
            party: "民主党"
        };
        us.electionYear = year + 4;
        us.midtermYear = year + 2;
        us.supportHistory = []; // Array of { year, parties: [{name, support}] }
        
        // Assign all land
        landTiles.forEach(tIdx => {
            ownerGrid[tIdx] = us.id;
            us.tiles.push(tIdx);
        });
        
        // Generate State Capitals & Initialize Local Politics
        const numStates = 50;
        for (let i=0; i<numStates; i++) {
            if (us.tiles.length === 0) break;
            const t = us.tiles[Math.floor(Math.random() * us.tiles.length)];
            // Check distance
            const tooClose = us.cities.some(c => getDistSq(c.tileIdx, t) < 100);
            if (!tooClose) {
                const cityName = us.generateCityName();
                const city = new City(cityName, t, us.id);
                
                // Electoral Votes (Census: Base 3 + Random Pop Factor)
                city.electoralVotes = 3 + Math.floor(Math.random() * 10); 

                // Initialize local support with variance
                let total = 0;
                us.parties.forEach(p => {
                    let base = p.support; // National average
                    // Random variance: +/- 20%
                    let variance = (Math.random() - 0.5) * 40;
                    let val = Math.max(0, base + variance);
                    city.partySupport[p.name] = val;
                    total += val;
                });
                // Normalize
                us.parties.forEach(p => {
                    city.partySupport[p.name] = (city.partySupport[p.name] / total) * 100;
                });

                us.cities.push(city);
            }
        }
        
        us.updateCentroid();
        nations.push(us);
        
    } else {
        // Default Spawning Logic
        const numNations = Math.max(2, Math.floor(landTiles.length / 50)); 
        
        for(let i=0; i<numNations; i++) {
            if(landTiles.length === 0) break;
            // ランダムな陸地を選ぶ
            let rndIdx = Math.floor(Math.random() * landTiles.length);
            let tileIdx = landTiles[rndIdx];
            landTiles.splice(rndIdx, 1);
            
            let y = Math.floor(tileIdx / width);
            let x = tileIdx % width;
            
            // 既に誰かの領土ならスキップ（初期配置は離す）
            if(ownerGrid[tileIdx] !== -1) continue;
            
            nations.push(new Nation(undefined, x, y));
        }
        
        // 初期領土拡大 (Flood fill的)
        expandTerritoryInitial();
    }
}

function expandTerritoryInitial() {
    // 簡易的に各国の周囲を埋める
    let changed = true;
    let loopCount = 0;
    while(changed && loopCount < 20) {
        changed = false;
        let newOwners = [...ownerGrid];
        
        // ランダムな順序で処理するためにシャッフル
        let indices = Array.from({length: width*height}, (_, i) => i);
        indices.sort(() => Math.random() - 0.5);

        for(let i of indices) {
            if(grid[i] === 0) continue; // 海は無視
            if(ownerGrid[i] !== -1) continue; // 所有者あり

            // 隣接タイルをチェック
            let neighbors = [];
            let cx = i % width;
            let cy = Math.floor(i / width);
            
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
                let nx=cx+dx, ny=cy+dy;
                if(nx>=0 && nx<width && ny>=0 && ny<height) {
                    let nIdx = ny*width+nx;
                    if(ownerGrid[nIdx] !== -1) neighbors.push(ownerGrid[nIdx]);
                }
            });

            if(neighbors.length > 0) {
                // 最も多い隣国に吸収される確率が高い
                let chosen = neighbors[Math.floor(Math.random()*neighbors.length)];
                newOwners[i] = chosen;
                nations[chosen].tiles.push(i);
                changed = true;
            }
        }
        ownerGrid = newOwners;
        loopCount++;
    }

    // 初期重心計算
    nations.forEach(n => n.updateCentroid());
}


/**
 * メインループとシミュレーション
 */
// バックグラウンド進行のためのWorker設定
const gameWorker = new Worker('game-worker.js');
gameWorker.onmessage = function(e) {
    if (e.data === 'tick') {
        updateGame();
    }
};

function updateGame() {
    if (!isDrawing && !isPaused) {
        frameCounter++;
        let speedMod = (activeScenario === 'QUIET_SPARKS') ? 5 : 1;
        if (frameCounter >= (11 - simSpeed) * speedMod) {
            frameCounter = 0;
            simulateTick();
            year++;
            document.getElementById('info-year').innerText = year;
            document.getElementById('info-tension').innerText = worldTension.toFixed(1) + "%";
            document.getElementById('info-tension').style.color = `rgb(${worldTension*2.55}, ${255 - worldTension*2.55}, 0)`;
            
            // Top Bar Updates
            document.getElementById('top-ui-year').innerText = year;
            const tVal = worldTension.toFixed(1);
            const tEl = document.getElementById('top-ui-tension');
            tEl.innerText = tVal + "%";
            tEl.style.color = worldTension > 50 ? "#ff6b6b" : "#4db8ff";

            // Hegemon Update
            const hEl = document.getElementById('info-hegemon');
            if (hegemonId !== -1) {
                const h = nations.find(n => n.id === hegemonId);
                if (h) {
                    hEl.innerText = h.name + " (" + hegemonStatus + ")";
                    hEl.style.color = h.color;
                } else {
                    hEl.innerText = "なし";
                    hEl.style.color = "#ccc";
                }
            } else {
                hEl.innerText = "なし";
                hEl.style.color = "#ccc";
            }

            // Real-time Ranking Update
            if (document.getElementById('ranking-modal').style.display === 'block') {
                renderRankingContent();
            }
        }
    }
}

function loop() {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderMap();
    
    // Logic is now handled by updateGame via Worker

    if (selectedNationId !== -1) updateNationPanel();

    animationFrame = requestAnimationFrame(loop);
}

function renderMap() {
    // 画面全体に収まるようにスケール調整（0.95倍のマージンを持たせる）
    mapScale = Math.min(canvas.width / (width * TILE_SIZE), canvas.height / (height * TILE_SIZE)) * 0.95;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(mapScale, mapScale);
    ctx.translate(-(width * TILE_SIZE) / 2, -(height * TILE_SIZE) / 2);

    const offsetX = 0;
    const offsetY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const type = grid[i];
            const owner = ownerGrid[i];
            
            let color = COLORS.WATER;
            if (type === 1) {
                // Elevation gradient for land
                if (mapMode === 'terrain') {
                    const h = elevationGrid[i];
                    // 0.0 (Green) -> 0.5 (Dark Green) -> 0.8 (Brown) -> 1.0 (White)
                    if (h < 0.3) {
                        const v = Math.floor(h * 3.3 * 50);
                        color = `rgb(${50-v}, ${100+v}, ${50-v})`;
                    } else if (h < 0.6) {
                        const v = Math.floor((h-0.3) * 3.3 * 50);
                        color = `rgb(${100+v}, ${150-v}, 50)`;
                    } else if (h < 0.8) {
                        const v = Math.floor((h-0.6) * 5 * 100);
                        color = `rgb(${160+v}, ${140+v}, 100)`;
                    } else {
                        const v = Math.floor((h-0.8) * 5 * 155);
                        color = `rgb(${200+v}, ${200+v}, ${200+v})`;
                    }
                } else {
                    color = COLORS.LAND;
                }
            }
            if (type === 2) color = COLORS.MOUNTAIN;
            if (type === 3) color = COLORS.RIVER;
            if (type === 4) color = COLORS.MAJOR_RIVER;

            // 描画ロジックの分離
            if (mapMode === 'military' && !isDrawing) {
                // 軍事モード: ヒートマップ表示
                const density = militaryGrid[i] || 0;
                
                // ベースとなる地形色 (少し暗め)
                let baseR=26, baseG=42, baseB=58; // WATER
                if (type === 1) { baseR=30; baseG=40; baseB=30; } // LAND
                if (type === 2) { baseR=40; baseG=40; baseB=40; } // MOUNTAIN
                if (type === 3 || type === 4) { baseR=20; baseG=60; baseB=100; } // RIVER

                if (density > 0) {
                    // 密度に応じた色 (青 -> 緑 -> 黄 -> 赤)
                    // densityの値を0-1にクランプして利用 (実際の値はそれ以上になりうるので調整)
                    const d = Math.min(1, density / 2); 
                    let r, g, b;
                    if (d < 0.25) {
                        r = baseR + (0 - baseR) * (d / 0.25);
                        g = baseG + (255 - baseG) * (d / 0.25);
                        b = baseB + (255 - baseB) * (d / 0.25);
                    } else if (d < 0.5) {
                        r = 0;
                        g = 255;
                        b = 255 - 255 * ((d - 0.25) / 0.25);
                    } else if (d < 0.75) {
                        r = 255 * ((d - 0.5) / 0.25);
                        g = 255;
                        b = 0;
                    } else {
                        r = 255;
                        g = 255 - 255 * ((d - 0.75) / 0.25);
                        b = 0;
                    }
                    ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
                } else {
                    ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
                }
                ctx.fillRect(offsetX + x*TILE_SIZE, offsetY + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);

            } else if (mapMode === 'political' && owner !== -1 && !isDrawing) {
                // 政治モード: 地形を隠し、国の色のみを表示
                const nat = nations.find(n => n.id === owner);
                if (nat) {
                    let fillColor = nat.color;
                    
                    // Detailed Domestic Politics Mode
                    if (activeScenario === 'GRACEFUL_US' && nat.id === nations[0].id) {
                        // Find nearest city
                        let bestCity = null;
                        let minDist = Infinity;
                        
                        for (const c of nat.cities) {
                            const dx = (c.tileIdx % width) - x;
                            const dy = Math.floor(c.tileIdx / width) - y;
                            const dist = dx*dx + dy*dy;
                            if (dist < minDist) {
                                minDist = dist;
                                bestCity = c;
                                if (minDist < 10) break; 
                            }
                        }
                        
                        if (bestCity && bestCity.partySupport) {
                            let maxSupport = -1;
                            let dominantColor = nat.color;
                            nat.parties.forEach(p => {
                                if (bestCity.partySupport[p.name] > maxSupport) {
                                    maxSupport = bestCity.partySupport[p.name];
                                    dominantColor = p.color;
                                }
                            });
                            fillColor = dominantColor;
                        }
                    } else {
                        if (nat.isPuppet && nat.masterId !== -1) {
                            const master = nations.find(m => m.id === nat.masterId);
                            if (master) fillColor = master.color;
                        }
                    }

                    ctx.fillStyle = fillColor;
                    ctx.fillRect(offsetX + x*TILE_SIZE, offsetY + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            } else if (mapMode === 'alliance' && owner !== -1 && !isDrawing) {
                // 同盟モード: 同盟ブロックごとに色分け
                const nat = nations.find(n => n.id === owner);
                if (nat) {
                    let fillColor = nat.color;
                    if (nat.allianceId !== -1) {
                        const alliance = alliances.find(a => a.id === nat.allianceId);
                        if (alliance) fillColor = alliance.color;
                    } else if (nat.isPuppet && nat.masterId !== -1) {
                        const master = nations.find(m => m.id === nat.masterId);
                        if (master) {
                            if (master.allianceId !== -1) {
                                const alliance = alliances.find(a => a.id === master.allianceId);
                                if (alliance) fillColor = alliance.color;
                            } else {
                                fillColor = master.color;
                            }
                        }
                    }
                    ctx.fillStyle = fillColor;
                    ctx.fillRect(offsetX + x*TILE_SIZE, offsetY + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            } else {
                // 地形モード (または領土なし): 地形の色を表示
                ctx.fillStyle = color;
                ctx.fillRect(offsetX + x*TILE_SIZE, offsetY + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                // 地形モードのみ山や川を表示
                if (type === 2) { // 山
                    // Draw mountain peak
                    ctx.fillStyle = "rgba(20,20,20,0.6)";
                    ctx.beginPath();
                    ctx.moveTo(offsetX + x*TILE_SIZE, offsetY + (y+1)*TILE_SIZE);
                    ctx.lineTo(offsetX + (x+0.5)*TILE_SIZE, offsetY + y*TILE_SIZE);
                    ctx.lineTo(offsetX + (x+1)*TILE_SIZE, offsetY + (y+1)*TILE_SIZE);
                    ctx.fill();
                }
                else if (type === 3) { // 川
                    ctx.fillStyle = "rgba(100,200,255,0.8)";
                    ctx.fillRect(offsetX + x*TILE_SIZE + TILE_SIZE/3, offsetY + y*TILE_SIZE, TILE_SIZE/3, TILE_SIZE);
                }
                else if (type === 4) { // 大河
                    ctx.fillStyle = "#1f618d";
                    ctx.fillRect(offsetX + x*TILE_SIZE, offsetY + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }
    
    // 国境線の描画 (HOI4スタイル)
    if (!isDrawing && (mapMode === 'political' || mapMode === 'alliance')) {
        ctx.lineWidth = 2;
        
        // Build relation cache for performance
        const relationCache = {};
        nations.forEach(n => {
            if (n.isDead) return;
            relationCache[n.id] = { war: new Set(n.atWarWith), allies: new Set(n.allies) };
        });

        const getStrokeColor = (o1, o2) => {
            if (o1 === -1 || o2 === -1 || o1 === o2 || o2 === -2) return "rgba(0,0,0,0.5)";
            const r1 = relationCache[o1];
            if (!r1) return "rgba(0,0,0,0.5)";
            if (r1.war.has(o2)) return "#5e0b0b"; // 暗い赤 (War)
            if (r1.allies.has(o2)) return "#064021"; // 暗い緑 (Allies)
            return "rgba(0,0,0,0.5)";
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const owner = ownerGrid[i];
                if (owner === -1) continue;

                const rightOwner = (x < width - 1) ? ownerGrid[i + 1] : -2;
                const bottomOwner = (y < height - 1) ? ownerGrid[i + width] : -2;

                if (owner !== rightOwner) {
                    ctx.strokeStyle = getStrokeColor(owner, rightOwner);
                    ctx.beginPath();
                    ctx.moveTo(offsetX + (x + 1) * TILE_SIZE, offsetY + y * TILE_SIZE);
                    ctx.lineTo(offsetX + (x + 1) * TILE_SIZE, offsetY + (y + 1) * TILE_SIZE);
                    ctx.stroke();
                }
                if (owner !== bottomOwner) {
                    ctx.strokeStyle = getStrokeColor(owner, bottomOwner);
                    ctx.beginPath();
                    ctx.moveTo(offsetX + x * TILE_SIZE, offsetY + (y + 1) * TILE_SIZE);
                    ctx.lineTo(offsetX + (x + 1) * TILE_SIZE, offsetY + (y + 1) * TILE_SIZE);
                    ctx.stroke();
                }
            }
        }
    }

    // 都市の描画
    if (!isDrawing && (mapMode === 'political' || mapMode === 'alliance')) {
        nations.forEach(n => {
            if (n.isDead) return;
            n.cities.forEach((city, idx) => {
                const cx = city.tileIdx % width;
                const cy = Math.floor(city.tileIdx / width);
                
                if (idx === 0) {
                    // 首都: 星形
                    drawStar(offsetX + cx*TILE_SIZE + TILE_SIZE/2, offsetY + cy*TILE_SIZE + TILE_SIZE/2, 5, TILE_SIZE*0.8, TILE_SIZE*0.4, "#f1c40f");
                } else {
                    // 都市の影/縁
                    ctx.fillStyle = "rgba(0,0,0,0.5)";
                    ctx.beginPath();
                    ctx.arc(offsetX + cx*TILE_SIZE + TILE_SIZE/2, offsetY + cy*TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2, 0, Math.PI*2);
                    ctx.fill();
                    
                    // 都市本体
                    ctx.fillStyle = "#fff";
                    ctx.beginPath();
                    ctx.arc(offsetX + cx*TILE_SIZE + TILE_SIZE/2, offsetY + cy*TILE_SIZE + TILE_SIZE/2, TILE_SIZE/3, 0, Math.PI*2);
                    ctx.fill();
                }
            });
        });

        // 国名の描画 (HOI4スタイル)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (mapMode === 'alliance') {
            // 同盟モード: 同盟ブロック名の描画
            alliances.forEach(a => {
                if (a.largestComponentSize > 30) {
                    const baseSize = 10 / mapScale;
                    const sizeBonus = Math.min(12 / mapScale, (a.largestComponentSize / 600) / mapScale);
                    const fontSize = (baseSize + sizeBonus) * 1.2; // 同盟名は少し大きく
                    
                    ctx.font = `bold ${fontSize}px "Yu Gothic", "SimHei", "Segoe UI", sans-serif`;
                    const drawX = offsetX + a.visualCentroid.x * TILE_SIZE;
                    const drawY = offsetY + a.visualCentroid.y * TILE_SIZE;
                    
                    ctx.save();
                    ctx.translate(drawX, drawY);
                    ctx.rotate(a.visualAngle);
                    ctx.strokeStyle = "rgba(0,0,0,0.8)";
                    ctx.lineWidth = Math.max(3 / mapScale, 2);
                    ctx.strokeText(a.name, 0, 0);
                    ctx.fillStyle = a.color;
                    ctx.fillText(a.name, 0, 0);
                    ctx.restore();
                }
            });
            // 同盟に属さない主要国も表示
            nations.forEach(n => {
                if (!n.isDead && !n.isPuppet && n.allianceId === -1 && n.largestComponentSize > 50) {
                    const baseSize = 10 / mapScale;
                    const sizeBonus = Math.min(12 / mapScale, (n.largestComponentSize / 600) / mapScale);
                    const fontSize = baseSize + sizeBonus;
                    ctx.font = `bold ${fontSize}px "Yu Gothic", "SimHei", "Segoe UI", sans-serif`;
                    const drawX = offsetX + n.visualCentroid.x * TILE_SIZE;
                    const drawY = offsetY + n.visualCentroid.y * TILE_SIZE;
                    ctx.save();
                    ctx.translate(drawX, drawY);
                    ctx.rotate(n.visualAngle);
                    ctx.strokeStyle = "rgba(0,0,0,0.8)";
                    ctx.lineWidth = Math.max(3 / mapScale, 2);
                    ctx.strokeText(n.name, 0, 0);
                    ctx.fillStyle = n.color;
                    ctx.fillText(n.name, 0, 0);
                    ctx.restore();
                }
            });
        } else {
            // 通常モード (政治モードなど)
            nations.forEach(n => {
                // 傀儡国の名前は非表示
                if (n.isPuppet) return;
                
                if (!n.isDead && n.largestComponentSize > 30) {
                    // mapScaleが小さい（ズームアウトしている）ほど、フォントサイズを大きくして視認性を維持
                    const baseSize = 10 / mapScale;
                    const sizeBonus = Math.min(12 / mapScale, (n.largestComponentSize / 600) / mapScale);
                    const fontSize = baseSize + sizeBonus;
                    
                    ctx.font = `bold ${fontSize}px "Yu Gothic", "SimHei", "Segoe UI", sans-serif`;

                    const drawX = offsetX + n.visualCentroid.x * TILE_SIZE;
                    const drawY = offsetY + n.visualCentroid.y * TILE_SIZE;
                    
                    ctx.save();
                    ctx.translate(drawX, drawY);
                    ctx.rotate(n.visualAngle);

                    // 文字の縁取り (厚め)
                    ctx.strokeStyle = "rgba(0,0,0,0.8)";
                    ctx.lineWidth = Math.max(3 / mapScale, 2);
                    ctx.strokeText(n.name, 0, 0);
                    
                    // 文字本体
                    ctx.fillStyle = n.color;
                    ctx.fillText(n.name, 0, 0);

                    ctx.restore();
                }
            });
        }

    }

    // 外枠
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, width*TILE_SIZE, height*TILE_SIZE);

    ctx.restore();

}

function handlePolitics(n) {
    if (n.isDead) return;

    // 統治安定度の更新 (技術や体制の変化を反映)
    n.governance = (n.sysBroad === '民主主義' ? 60 : (n.sysBroad === '全体主義' ? 70 : 50)) + (n.tech * 5);

    // 傀儡国の独立判定
    if (n.isPuppet) {
        const master = nations.find(m => m.id === n.masterId);
        
        // 1. 宗主国が消滅している場合 -> 即時独立
        if (!master || master.isDead) {
            declareIndependence(n);
        }
        // 2. 機会主義的独立 (宗主国が不安定かつ自国が安定)
        // 徹底抗戦モードでは独立不可
        else if (activeScenario !== 'TOTALLER_KRIEG') {
            // 海を隔てているかチェック
            let isSeparated = false;
            if (n.tiles.length > 0 && master.tiles.length > 0) {
                 const myTile = n.cities.length > 0 ? n.cities[0].tileIdx : n.tiles[0];
                 const masterTile = master.cities.length > 0 ? master.cities[0].tileIdx : master.tiles[0];
                 // Check if continent map is valid (not -1) and different
                 if (continentMap[myTile] !== -1 && continentMap[masterTile] !== -1 && continentMap[myTile] !== continentMap[masterTile]) {
                     isSeparated = true;
                 }
            }

            // 海を隔てている場合、独立確率が大幅に上昇し、宗主国の安定度条件が緩和される
            let independenceThreshold = isSeparated ? 60 : 30; // 宗主国の安定度が60未満でも独立チャンス
            let chance = isSeparated ? 0.02 : 0.005;

            if (n.stability > 70 && master.stability < independenceThreshold && Math.random() < chance) {
                declareIndependence(n);
            }
        }
    }

    // 指導者の交代
    if (Math.random() < 0.005) {
        const oldLeader = n.leader;
        n.leader = n.generateLeaderName();
        let stabChange = Math.floor(Math.random() * 30) - 20; // -20 to +10
        // 大統領制は指導者交代時の安定度低下が大きい
        if (n.sysDetailed === "大統領制") {
            stabChange -= 15;
        }
        n.stability = clamp(n.stability + stabChange, 0, 100);
        log(`${n.name}の指導者が${oldLeader}から${n.leader}に交代しました。(安定度: ${stabChange > 0 ? "+" : ""}${stabChange})`, "log-info");
        n.addHistory(`指導者交代: ${oldLeader} -> ${n.leader}`);

        // Grand Empire or Large Socialist Nation Succession Crisis
        const isLargeSocialist = n.isSocialist() && n.tiles.length >= 40;

        if ((n.isGrandEmpire || isLargeSocialist) && activeScenario !== 'TOTALLER_KRIEG') {
            let collapseProb = n.isGrandEmpire ? 0.9 : 0.4;
            let civilWarProb = n.isGrandEmpire ? 0.8 : 0.6;
            
            if (activeScenario === 'QUIET_SPARKS') {
                collapseProb *= 0.1;
                civilWarProb *= 0.2;
            }

            // 大帝国や大規模社会主義国の崩壊 (群雄割拠へ)
            if (Math.random() < collapseProb) {
                triggerImperialCollapse(n);
            } else if (n.cities.length >= 2 && Math.random() < civilWarProb) {
                triggerSuccessionCivilWar(n);
            }
        }
    }

    // 王政国家向けのランダムイベント (共和派の台頭など)
    if ((n.sysDetailed.includes('君主') || n.sovereign === '君主') && Math.random() < 0.002) {
        const events = [
            { msg: "共和派の活動が活発化しています。", stab: -15 },
            { msg: "啓蒙思想が広まり、旧体制への不満が高まっています。", stab: -10 },
            { msg: "宮廷内での権力争いが発生しました。", stab: -12 }
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        n.stability = clamp(n.stability + event.stab, 0, 100);
        log(`${n.name}: ${event.msg} (安定度: ${event.stab})`, "log-war");
    }

    // 安定度の自然変動
    if (n.atWarWith.length > 0) {
        // 民主主義は戦争疲弊が少ない
        const stabLoss = (n.sysBroad === '民主主義') ? 0.2 : 0.4;
        n.stability -= stabLoss;
    } else {
        n.stability = Math.min(100, n.stability + 0.5);
    }

    // 不満度の更新
    // 統治安定度(Governance)が不満を緩和する
    n.unrest = Math.max(0, 100 - n.stability - (n.governance / 2));

    // 都市ごとの不満度更新
    n.cities.forEach((city, idx) => {
        let cityUnrest = n.unrest + (Math.random() * 20 - 10);
        // 首都(index 0)からの距離による不満度増加
        if (idx > 0) {
            const capital = n.cities[0];
            const dx = (city.tileIdx % width) - (capital.tileIdx % width);
            const dy = Math.floor(city.tileIdx / width) - Math.floor(capital.tileIdx / width);
            const dist = Math.sqrt(dx*dx + dy*dy);
            cityUnrest += dist / 5;

            // 海を隔てている場合のペナルティ (非常に大きい)
            if (continentMap[city.tileIdx] !== -1 && continentMap[capital.tileIdx] !== -1 && continentMap[city.tileIdx] !== continentMap[capital.tileIdx]) {
                cityUnrest += 25; 
            }
        }
        city.unrest = clamp(cityUnrest, 0, 100);
    });

    // 反乱クールダウンの消化
    if (n.rebellionCooldown > 0) n.rebellionCooldown--;

    // 都市単位の内戦判定
    let rebellingCities = [];
    if (n.rebellionCooldown === 0 && n.cities.length > 0) {
        n.cities.forEach(city => {
            // 共和制(民主主義)の国は反乱確率を極端に下げる (0.005 -> 0.00005)
            // また、必要な不満度も引き上げる (75 -> 90)
            let rebelChance = (n.sysBroad === '民主主義') ? 0.00005 : 0.005;
            let unrestThreshold = (n.sysBroad === '民主主義') ? 90 : 75;

            if (activeScenario === 'QUIET_SPARKS') {
                rebelChance /= 20;
                unrestThreshold = Math.min(100, unrestThreshold + 10);
            }

            if (city.unrest > unrestThreshold && Math.random() < rebelChance) {
                rebellingCities.push(city);
            }
        });
    }

    if (rebellingCities.length > 0) {
        // 周囲の不満が高い都市も誘い込む
        n.cities.forEach(city => {
            if (!rebellingCities.includes(city) && city.unrest > 50) {
                let isNear = rebellingCities.some(rc => {
                    const dx = (city.tileIdx % width) - (rc.tileIdx % width);
                    const dy = Math.floor(city.tileIdx / width) - Math.floor(rc.tileIdx / width);
                    return Math.sqrt(dx*dx + dy*dy) < 30;
                });
                if (isNear && Math.random() < 0.5) rebellingCities.push(city);
            }
        });
        triggerCityRebellion(n, rebellingCities);
    }

    // 政変の判定
    let coupThreshold = (n.sysBroad === '民主主義') ? 40 : 50; // 民主制は崩壊しにくい
    let coupChance = (n.sysBroad === '民主主義') ? 0.0005 : 0.002;

    if (activeScenario === 'QUIET_SPARKS') {
        coupChance /= 10;
        coupThreshold -= 10;
    }

    if (n.stability < coupThreshold && Math.random() < coupChance) {
        // 徹底抗戦モードの枢軸国・連合国は政変不可
        if (activeScenario === 'TOTALLER_KRIEG' && (n.name === '枢軸国' || n.name === '連合国')) return;

        const oldName = n.name;
        const oldGov = n.sysDetailed;
        
        // 権威主義または軍事政権へ移行
        n.sysBroad = '権威主義';
        n.sysDetailed = (Math.random() > 0.5) ? "個人独裁制" : "軍事評議会制";
        n.sovereign = (n.sysDetailed === '軍事評議会制') ? '軍部' : '独裁者';
        n.govType = n.sysDetailed;

        n.updateName();
        n.stability = Math.max(0, n.stability - 30);
        log(`${oldName}で政変が発生！ ${oldGov}から${n.sysDetailed}へ体制が変わり、${n.name}となりました。`, "log-war");
        n.addHistory(`政変: ${oldGov} -> ${n.sysDetailed} (${oldName} -> ${n.name})`);
    }

    // 民主制への移行
    if (isDemocracyAwakened && n.sysBroad !== '民主主義' && n.tech >= 3 && n.stability > 80 && Math.random() < 0.001) {
        // 徹底抗戦モードの枢軸国は民主化しない
        if (activeScenario === 'TOTALLER_KRIEG' && n.name === '枢軸国') return;

        const oldName = n.name;
        
        n.sysBroad = '民主主義';
        n.sysDetailed = (Math.random() < 0.5) ? "議院内閣制" : "大統領制";
        n.sovereign = '国民';
        n.ecoIdeology = (Math.random() < 0.5) ? '自由放任主義' : '混合経済';
        n.govType = n.sysDetailed;

        n.regimeNumber++;
        n.updateName();
        log(`${oldName}は近代化に伴い民主化し、${n.name}となりました。`, "log-peace");
        n.addHistory(`民主化: ${oldName} -> ${n.name}`);
    }

    // 社会主義への移行
    if (isSocialismSprouted && n.sysDetailed !== '前衛党独裁' && n.tech >= 2 && n.stability < 40 && Math.random() < 0.001) {
        // 徹底抗戦モードの枢軸国・連合国は革命不可
        if (activeScenario === 'TOTALLER_KRIEG' && (n.name === '枢軸国' || n.name === '連合国')) return;

        const oldName = n.name;
        n.sysBroad = '全体主義';
        n.sysDetailed = '前衛党独裁';
        n.sovereign = '党';
        n.ecoIdeology = '計画経済';
        n.govType = n.sysDetailed;

        n.stability = Math.min(100, n.stability + 30);
        n.updateName();
        log(`${oldName}で社会主義革命が発生し、${n.name}となりました。`, "log-war");
        n.addHistory(`社会主義革命: ${oldName} -> ${n.name}`);
    }

    // 平和的独立 (低確率)
    if (n.stability < 60 && n.cities.length > 2) {
        // 首都以外で不満が高い都市が対象
        const potentialCities = n.cities.filter((c, i) => i > 0 && c.unrest > 80);
        potentialCities.forEach(city => {
            if (Math.random() < 0.001) { // 非常に低確率
                grantIndependence(n, city);
            }
        });
    }

    // 反乱軍の正統化
    if (n.isRebel && n.stability > 70 && n.tiles.length > 25 && Math.random() < 0.01) {
        n.isRebel = false;
        const oldName = n.name;
        
        // システムを再構築
        const system = generatePoliticalSystem(n.tech);
        n.sysBroad = system.sysBroad;
        n.sysDetailed = system.sysDetailed;
        n.sovereign = system.sovereign;
        n.stateStruct = system.stateStruct;
        n.ecoIdeology = system.ecoIdeology;
        n.govType = n.sysDetailed;

        n.updateName();
        log(`${oldName}は安定した統治を確立し、${n.name}として国家の正統性を主張し始めました。`, "log-peace");
        n.addHistory(`正統化: ${oldName} -> ${n.name}`);
    }

    // 政党支持率の変動と記録 (民主主義国向け、USシナリオのメイン国以外)
    const isUSMain = (activeScenario === 'GRACEFUL_US' && n.id === nations[0].id);
    if (n.sysBroad === '民主主義' && n.parties && n.parties.length > 0 && !isUSMain) {
        // 支持率のランダム変動
        n.parties.forEach(p => {
            p.support += (Math.random() - 0.5) * 2.0;
            p.support = Math.max(0, p.support);
        });
        
        // 正規化
        let total = n.parties.reduce((sum, p) => sum + p.support, 0);
        if (total > 0) {
            n.parties.forEach(p => p.support = (p.support / total) * 100);
        }

        // 議席更新 (簡易)
        let remaining = n.parliamentSize;
        n.parties.forEach(p => {
            p.seats = Math.floor((p.support / 100) * n.parliamentSize);
            remaining -= p.seats;
        });
        // 最大政党に余りを付与
        let largest = n.parties.reduce((prev, curr) => prev.support > curr.support ? prev : curr);
        largest.seats += remaining;

        // 履歴記録 (1年に1回)
        if (!n.lastHistoryYear) n.lastHistoryYear = 0;
        if (year > n.lastHistoryYear) {
            n.lastHistoryYear = year;
            let historyEntry = { year: year, parties: [] };
            n.parties.forEach(p => {
                historyEntry.parties.push({ name: p.name, color: p.color, support: p.support });
            });
            n.supportHistory.push(historyEntry);
            if (n.supportHistory.length > 100) n.supportHistory.shift();
        }
    }

    // 追い詰められた宗主国による緊急併合 (生存戦略)
    if (!n.isPuppet && (n.tiles.length < 15 || n.cities.length === 0) && !n.isDead) {
        const myPuppet = nations.find(p => p.isPuppet && p.masterId === n.id && !p.isDead);
        if (myPuppet) {
            // 全土併合
            log(`緊急事態: 追い詰められた${n.name}は、国家存続のために傀儡国である${myPuppet.name}を緊急併合しました！`, "log-war");
            n.addHistory(`緊急併合: ${myPuppet.name}を併合`);
            
            // タイルの移動
            const puppetTiles = [...myPuppet.tiles];
            puppetTiles.forEach(tileIdx => {
                ownerGrid[tileIdx] = n.id;
                n.tiles.push(tileIdx);
            });
            myPuppet.tiles = [];

            // 都市の移動
            myPuppet.cities.forEach(city => {
                city.nationId = n.id;
                n.cities.push(city);
            });
            myPuppet.cities = [];

            // 傀儡国消滅
            myPuppet.isDead = true;
            myPuppet.pop = 0; // 人口も吸収すべきだが簡易的に0に
            
            // 安定度回復
            n.stability = Math.min(100, n.stability + 30);
        }
    }
}

function declareIndependence(n) {
    if (!n.isPuppet) return;
    
    const oldName = n.name;
    const oldMasterId = n.masterId;
    
    n.isPuppet = false;
    n.masterId = -1;
    n.updateName();
    
    const master = nations.find(m => m.id === oldMasterId);
    if (master && !master.isDead) {
        log(`独立宣言: ${oldName}は${master.name}からの独立を宣言し、${n.name}となりました。`, "log-peace");
        master.addHistory(`独立: ${n.name}が独立`);
        n.addHistory(`独立: ${master.name}より独立`);
        
        // 宗主国との関係悪化
        if (master.relations[n.id] !== undefined) master.relations[n.id] -= 50;
        else master.relations[n.id] = -50;
        
        if (n.relations[master.id] !== undefined) n.relations[master.id] -= 50;
        else n.relations[master.id] = -50;
        
        // 安定度上昇 (独立の高揚感)
        n.stability = Math.min(100, n.stability + 10);
    } else {
        log(`独立回復: 宗主国の消滅または不在に伴い、${oldName}は${n.name}として主権を回復しました。`, "log-peace");
        n.addHistory(`主権回復: 宗主国消滅による`);
    }
}

/**
 * 自然な国境生成 (Dijkstra法による領土拡張)
 */
function getNaturalTerritory(ownerId, seedIndices, targetCount) {
    const claimed = new Set();
    // 簡易優先度付きキュー (コスト順にソート)
    let frontier = []; 
    const visitedCost = new Map(); // idx -> cost

    seedIndices.forEach(idx => {
        frontier.push({idx: idx, cost: 0});
        visitedCost.set(idx, 0);
    });

    while (frontier.length > 0 && claimed.size < targetCount) {
        // コストが低い順に取り出す (末尾からpopするために降順ソート)
        frontier.sort((a, b) => b.cost - a.cost);
        const current = frontier.pop();
        
        if (claimed.has(current.idx)) continue;
        claimed.add(current.idx);

        const cx = current.idx % width;
        const cy = Math.floor(current.idx / width);
        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
        // 方向バイアスを避けるためシャッフル
        neighbors.sort(() => Math.random() - 0.5);

        for (const [dx, dy] of neighbors) {
            const nx = cx + dx;
            const ny = cy + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                
                // 同じ国の領土であり、未取得の場合のみ
                if (ownerGrid[nIdx] === ownerId && !claimed.has(nIdx)) {
                    let moveCost = 1 + Math.random(); // 基礎コスト + ランダム性
                    
                    const type = grid[nIdx];
                    const prevType = grid[current.idx];

                    // 地形コスト
                    if (type === 2) moveCost += 50; // 山岳は非常に越えにくい
                    if (type === 3) moveCost += 4; // 川は越えにくい
                    if (type === 4) moveCost += 12; // 大河は非常に越えにくい
                    if ((prevType === 3 || prevType === 4) && (type !== 3 && type !== 4)) moveCost += 6; // 川渡りコスト

                    const newCost = current.cost + moveCost;
                    
                    if (!visitedCost.has(nIdx) || newCost < visitedCost.get(nIdx)) {
                        visitedCost.set(nIdx, newCost);
                        frontier.push({idx: nIdx, cost: newCost});
                    }
                }
            }
        }
    }
    
    return Array.from(claimed);
}

function grantIndependence(n, city) {
    if (activeScenario === 'TOTALLER_KRIEG') return;

    const newNation = new Nation();
    newNation.baseName = n.baseName;
    
    // 都市名を冠した国名
    const prefix = city.name.substring(0, city.name.length - 1); // "市"などを取る
    let proposedName = prefix + (isDemocracyAwakened ? "共和国" : "王国");
    
    // Ensure uniqueness
    if (isNationNameTaken(proposedName)) {
        // proposedName is always "XXX共和国/王国" here, so we use Nth regime/numbering format
        let counter = 2;
        let finalName = proposedName;
        while(true) {
            let nextName = isDemocracyAwakened ? (proposedName + "第" + counter + "政") : (proposedName + " (" + counter + ")");
            if (!isNationNameTaken(nextName)) {
                finalName = nextName;
                break;
            }
            counter++;
            if (counter > 100) break;
        }
        newNation.name = finalName;
    } else {
        newNation.name = proposedName;
    }

    const system = generatePoliticalSystem(n.tech);
    if (isDemocracyAwakened) {
        newNation.sysBroad = '民主主義';
        newNation.sysDetailed = '議院内閣制';
        newNation.sovereign = '国民';
        newNation.generateParties();
    } else {
        newNation.sysBroad = '権威主義';
        newNation.sysDetailed = '絶対君主制';
        newNation.sovereign = '君主';
    }
    newNation.stateStruct = '単一国家';
    newNation.ecoIdeology = n.ecoIdeology;
    newNation.govType = newNation.sysDetailed;
    
    newNation.color = `hsl(${Math.random()*360}, 60%, 60%)`;
    newNation.tech = n.tech;
    newNation.religion = n.religion;

    // 領土と都市の委譲 (自然な国境)
    const targetSize = 130;
    const rebelTiles = getNaturalTerritory(n.id, [city.tileIdx], targetSize);
    const rebelTileSet = new Set(rebelTiles);

    rebelTiles.forEach(idx => {
        ownerGrid[idx] = newNation.id;
        newNation.tiles.push(idx);
    });
    n.tiles = n.tiles.filter(t => !rebelTileSet.has(t));
    
    city.nationId = newNation.id;
    newNation.cities.push(city);
    n.cities = n.cities.filter(c => c !== city);

    // 人口・兵力の分配
    const ratio = 1 / (n.cities.length + 1); // 簡易計算
    newNation.pop = Math.floor(n.pop * ratio);
    n.pop = Math.max(0, n.pop - newNation.pop);
    newNation.soldiers = Math.floor(n.soldiers * ratio * 0.5); // 兵力は少なめ
    n.soldiers = Math.max(0, n.soldiers - newNation.soldiers);

    if (newNation.tiles.length > 0) {
        nations.push(newNation);
        
        // 良好な関係でスタート
        n.relations[newNation.id] = 50;
        newNation.relations[n.id] = 50;
        
        log(`平和的独立: ${n.name}から${city.name}が分離し、${newNation.name}として独立しました。`, "log-peace");
        n.addHistory(`独立承認: ${newNation.name}`);
        newNation.addHistory(`独立: ${n.name}から分離独立`);
        
        // 安定度少し回復（厄介払いができたため）
        n.stability = Math.min(100, n.stability + 5);
    }
}

function triggerCityRebellion(n, cities) {
    if (activeScenario === 'TOTALLER_KRIEG') return;

    // 反乱軍の生成
    const rebel = new Nation();
    rebel.baseName = n.baseName;
    rebel.parentName = n.baseName;
    rebel.isRebel = true;

    // 反乱軍の政治体制
    rebel.ecoIdeology = n.ecoIdeology;
    rebel.stateStruct = '単一国家';

    if (n.sysBroad === '民主主義') {
         // 民主制からの反乱 -> 軍事クーデターや革命
         rebel.sysBroad = '権威主義';
         rebel.sysDetailed = '軍事評議会制';
         rebel.sovereign = '軍部';
    } else {
         // 権威主義からの反乱
         if (isDemocracyAwakened) {
             // 民主化革命
             rebel.sysBroad = '民主主義';
             rebel.sysDetailed = '革命政府';
             rebel.sovereign = '国民';
         } else {
             // 別の君主を立てるか軍が掌握
             rebel.sysBroad = '権威主義';
             rebel.sysDetailed = Math.random() < 0.5 ? '絶対君主制' : '軍事評議会制';
             rebel.sovereign = rebel.sysDetailed === '絶対君主制' ? '君主' : '軍部';
         }
    }
    rebel.govType = rebel.sysDetailed;

    // かっこいい反乱軍の名称生成
    let rebelTypes = [
        { name: "臨時政府", gov: "臨時政府", type: "DEMO" },
        { name: "立憲派", gov: "革命政府", type: "DEMO" },
        { name: "正統政府", gov: "正統政府", type: "OTHER" },
        { name: "救国戦線", gov: "軍事評議会制", type: "OTHER" },
        { name: "人民委員会", gov: "革命政府", type: "SOC" },
        { name: "暫定政府", gov: "暫定政府", type: "DEMO" },
        { name: "暫定統治機構", gov: "暫定統治機構", type: "OTHER" }
    ];
    if (!isDemocracyAwakened) {
        rebelTypes = rebelTypes.filter(t => t.type !== "DEMO");
    }
    if (!isSocialismSprouted) {
        rebelTypes = rebelTypes.filter(t => t.type !== "SOC");
    }
    
    // 特別な名称: 共和国第n政 (親が民主制の場合)
    if (isDemocracyAwakened && n.sysBroad === '民主主義' && Math.random() < 0.4) {
        rebel.sysBroad = '民主主義';
        rebel.sysDetailed = n.sysDetailed;
        rebel.sovereign = '国民';
        rebel.regimeNumber = n.regimeNumber + 1;
        rebel.govType = rebel.sysDetailed;
        rebel.generateParties();
        rebel.updateName();
    } else {
        const type = rebelTypes[Math.floor(Math.random() * rebelTypes.length)];
        rebel.sysDetailed = type.gov;
        // Adjust broad/sovereign for special types
        if (type.type === "SOC") {
            rebel.sysBroad = '全体主義';
            rebel.sysDetailed = '前衛党独裁';
            rebel.sovereign = '党';
            rebel.ecoIdeology = '計画経済';
        } else if (type.gov === '革命政府' || type.gov === '臨時政府' || type.gov === '暫定政府') {
            rebel.sysBroad = '民主主義';
            rebel.sovereign = '国民';
            if (isDemocracyAwakened) rebel.generateParties();
        } else if (type.gov === '軍事評議会制' || type.gov === '暫定統治機構') {
            rebel.sysBroad = '権威主義';
            rebel.sovereign = '軍部';
        } else if (type.gov === '正統政府') {
            rebel.sysBroad = n.sysBroad;
            rebel.sovereign = n.sovereign;
        }
        rebel.govType = rebel.sysDetailed;

        // 都市名を冠した名称にする (最初の都市)
        const prefix = cities[0].name.substring(0, cities[0].name.length - 1);
        let proposedName = prefix + type.name;

        // Ensure uniqueness
        if (isNationNameTaken(proposedName, rebel.id)) {
            let counter = 2;
            let finalName = proposedName;
            while(true) {
                let nextName = proposedName + " (" + counter + ")";
                if (!isNationNameTaken(nextName, rebel.id)) {
                    finalName = nextName;
                    break;
                }
                counter++;
                if (counter > 100) break;
            }
            rebel.name = finalName;
        } else {
            rebel.name = proposedName;
        }
    }

    rebel.rebellionCooldown = 200; // 初期無敵状態
    n.rebellionCooldown = 200; // 親国も一定期間再発防止
    rebel.color = `hsl(${Math.random()*360}, 80%, 40%)`;
    rebel.tech = n.tech;
    rebel.religion = n.religion;
    
    // 領土と都市の委譲 (自然な国境)
    const targetPerCity = 130;
    const totalTarget = cities.length * targetPerCity;
    const seedIndices = cities.map(c => c.tileIdx);
    
    const rebelTiles = getNaturalTerritory(n.id, seedIndices, totalTarget);
    const rebelTileSet = new Set(rebelTiles);

    rebelTiles.forEach(idx => {
        ownerGrid[idx] = rebel.id;
        rebel.tiles.push(idx);
    });
    n.tiles = n.tiles.filter(t => !rebelTileSet.has(t));

    // 都市の所属変更
    cities.forEach(city => {
        city.nationId = rebel.id;
        rebel.cities.push(city);
    });
    n.cities = n.cities.filter(c => !cities.includes(c));

    // 兵力と人口の分配
    const ratio = cities.length / (n.cities.length + cities.length);
    rebel.pop = Math.floor(n.pop * ratio);
    n.pop = Math.floor(n.pop - rebel.pop);
    rebel.soldiers = Math.floor(n.soldiers * ratio * 0.8);
    n.soldiers = Math.floor(n.soldiers - rebel.soldiers);

    if (rebel.tiles.length > 0) {
        nations.push(rebel);
        declareWar(n, rebel);
        log(`${n.name}で内戦が発生！ ${cities.map(c => c.name).join('、')}が${rebel.name}として蜂起しました。`, "log-war");
        n.addHistory(`内戦勃発: ${rebel.name}が蜂起`);
        rebel.addHistory(`蜂起: ${n.name}に対し反乱を開始`);
        n.stability = Math.max(0, n.stability - 20);
    }
}

function triggerSuccessionCivilWar(n) {
    // Create the pretender nation
    const rebel = new Nation();
    rebel.baseName = n.baseName;
    rebel.isRebel = false; // Claims to be legitimate
    
    rebel.isGrandEmpire = n.isGrandEmpire;
    rebel.sysBroad = n.sysBroad;
    rebel.sysDetailed = n.sysDetailed;
    rebel.sovereign = n.sovereign;
    rebel.stateStruct = n.stateStruct;
    rebel.ecoIdeology = n.ecoIdeology;
    rebel.govType = n.govType;
    rebel.tech = n.tech;
    rebel.religion = n.religion;
    rebel.color = `hsl(${Math.random()*360}, 100%, 30%)`; // Another dark color
    
    // Name handling - collision logic will handle uniqueness
    rebel.updateName();
    
    if (n.cities.length < 2) return; // Cannot split if limited cities
    
    // Pick a second capital (furthest from current capital)
    const capital = n.cities[0];
    let bestCity = null;
    let maxDist = -1;
    
    n.cities.forEach(c => {
        if (c === capital) return;
        const dist = getDistSq(c.tileIdx, capital.tileIdx);
        if (dist > maxDist) {
            maxDist = dist;
            bestCity = c;
        }
    });
    
    if (!bestCity) return;
    
    // Assign cities closer to rebel capital to rebel
    const rebelCities = [];
    const loyalCities = [capital];
    
    n.cities.forEach(c => {
        if (c === capital || c === bestCity) return;
        
        const d1 = getDistSq(c.tileIdx, capital.tileIdx);
        const d2 = getDistSq(c.tileIdx, bestCity.tileIdx);
        
        if (d2 < d1) rebelCities.push(c);
        else loyalCities.push(c);
    });
    rebelCities.push(bestCity);
    
    // Transfer cities
    rebelCities.forEach(c => {
        c.nationId = rebel.id;
        rebel.cities.push(c);
    });
    n.cities = loyalCities;
    
    // Transfer tiles (Voronoi split)
    const capX = capital.tileIdx % width;
    const capY = Math.floor(capital.tileIdx / width);
    const rebX = bestCity.tileIdx % width;
    const rebY = Math.floor(bestCity.tileIdx / width);
    
    const newNTiles = [];
    n.tiles.forEach(tIdx => {
        const tx = tIdx % width;
        const ty = Math.floor(tIdx / width);
        const d1 = (tx-capX)**2 + (ty-capY)**2;
        const d2 = (tx-rebX)**2 + (ty-rebY)**2;
        
        if (d2 < d1) {
            ownerGrid[tIdx] = rebel.id;
            rebel.tiles.push(tIdx);
        } else {
            newNTiles.push(tIdx);
        }
    });
    n.tiles = newNTiles;
    
    // Distribute Stats
    const ratio = rebel.tiles.length / (rebel.tiles.length + n.tiles.length);
    
    rebel.pop = Math.floor(n.pop * ratio);
    n.pop = Math.floor(n.pop - rebel.pop);
    
    rebel.soldiers = Math.floor(n.soldiers * ratio);
    n.soldiers = Math.floor(n.soldiers - rebel.soldiers);
    
    rebel.gdp = Math.floor(n.gdp * ratio);
    n.gdp = Math.floor(n.gdp - rebel.gdp);
    
    // Push to nations array
    if (rebel.tiles.length > 0) {
        nations.push(rebel);
        rebel.updateCentroid();
        n.updateCentroid();
        
        // War
        declareWar(n, rebel);
        
        // Log
        const warTitle = n.isSocialist() ? "権力闘争" : "帝位継承戦争";
        const warDesc = n.isSocialist() ? `${n.name}の指導者交代に伴う権力闘争により、国が二つに割れました！` : `${n.name}の皇帝崩御に伴い、国が二つに割れました！双方が正統性を主張しています。`;
        
        log(`${warTitle}: ${warDesc}`, "log-war");
        n.addHistory(`内戦勃発: ${warTitle}`);
        rebel.addHistory(`内戦勃発: ${warTitle}`);
        
        // Reduce stability significantly
        n.stability = 30;
        rebel.stability = 30;
    }
}

function getDistSq(idx1, idx2) {
    const x1 = idx1 % width;
    const y1 = Math.floor(idx1 / width);
    const x2 = idx2 % width;
    const y2 = Math.floor(idx2 / width);
    return (x1-x2)**2 + (y1-y2)**2;
}

function triggerImperialCollapse(n) {
    if (activeScenario === 'TOTALLER_KRIEG') return;
    if (n.tiles.length < 5) return; 

    const collapseMsg = n.isSocialist() 
        ? `崩壊: 指導者交代をきっかけに${n.name}の体制が瓦解し、各地で権力が分立しました！`
        : `崩壊: 指導者の死をきっかけに、大帝国${n.name}は制御を失い、群雄割拠の時代へと突入しました！`;

    log(collapseMsg, "log-war");
    n.addHistory(`滅亡: 指導者交代に伴う国家崩壊`);

    // Determine split centers
    let centers = [];
    
    // Use existing cities as priority centers
    n.cities.forEach(c => {
        centers.push({ type: 'city', obj: c, tile: c.tileIdx });
    });

    // If too few cities, add random tiles
    const targetSplits = Math.max(4, Math.ceil(n.tiles.length / 30)); 
    
    let attempts = 0;
    while (centers.length < targetSplits && attempts < 100) {
        const t = n.tiles[Math.floor(Math.random() * n.tiles.length)];
        let tooClose = false;
        const cx = t % width; 
        const cy = Math.floor(t / width);
        
        for (let c of centers) {
            const ox = c.tile % width;
            const oy = Math.floor(c.tile / width);
            if ((cx-ox)**2 + (cy-oy)**2 < 50) { 
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) {
            centers.push({ type: 'tile', obj: null, tile: t });
        }
        attempts++;
    }

    // Create new nations for each center
    const warlords = [];
    centers.forEach((center, idx) => {
        const w = new Nation();
        w.tech = n.tech;
        w.religion = n.religion;
        w.ecoIdeology = n.ecoIdeology;
        
        const sys = generatePoliticalSystem(n.tech);
        w.sysBroad = sys.sysBroad;
        w.sysDetailed = sys.sysDetailed;
        w.govType = w.sysDetailed;
        w.sovereign = sys.sovereign;
        if (w.sysBroad === '民主主義') w.generateParties();
        
        // Name generation
        if (center.type === 'city') {
            const city = center.obj;
            // Remove suffixes like 市, 府, etc
            const prefix = city.name.replace(/[市府京都港要塞]+$/, "");
            w.baseName = prefix;
        } else {
             w.baseName = w.generateBaseName();
        }
        w.updateName();

        w.color = `hsl(${Math.random()*360}, 70%, 50%)`;
        w.relations = {};
        
        // Assign center city if exists
        if (center.type === 'city') {
            const city = center.obj;
            city.nationId = w.id;
            w.cities.push(city);
        } else {
             const cityName = w.generateCityName();
             const city = new City(cityName, center.tile, w.id);
             w.cities.push(city);
        }
        
        warlords.push(w);
        nations.push(w);
    });
    
    // Clear parent cities list as they are reassigned
    n.cities = [];

    // Voronoi Assignment
    const oldTiles = [...n.tiles];
    n.tiles = [];
    
    oldTiles.forEach(tIdx => {
        const tx = tIdx % width;
        const ty = Math.floor(tIdx / width);
        
        let bestWarlord = null;
        let minDist = Infinity;
        
        warlords.forEach((w, wIdx) => {
            const centerTile = centers[wIdx].tile;
            const cx = centerTile % width;
            const cy = Math.floor(centerTile / width);
            const dist = (tx-cx)**2 + (ty-cy)**2;
            
            if (dist < minDist) {
                minDist = dist;
                bestWarlord = w;
            }
        });
        
        if (bestWarlord) {
            ownerGrid[tIdx] = bestWarlord.id;
            bestWarlord.tiles.push(tIdx);
        }
    });

    // Distribute Stats & Finalize
    const totalNewTiles = warlords.reduce((sum, w) => sum + w.tiles.length, 0);
    
    warlords.forEach(w => {
        if (w.tiles.length === 0) {
            w.isDead = true;
            return;
        }
        
        const ratio = w.tiles.length / totalNewTiles;
        
        w.pop = Math.floor(n.pop * ratio);
        w.gdp = Math.floor(n.gdp * ratio);
        w.soldiers = Math.floor(n.soldiers * ratio); 
        w.tanks = Math.floor(n.tanks * ratio);
        w.ships = Math.floor(n.ships * ratio);
        
        w.updateCentroid();
        
        warlords.forEach(other => {
            if (w !== other) {
                w.relations[other.id] = -100;
                w.atWarWith.push(other.id);
                if (!other.atWarWith.includes(w.id)) other.atWarWith.push(w.id);
            }
        });
        
        w.stability = 40 + Math.random() * 20; 
        w.addHistory(`建国: ${n.name}の崩壊により成立`);
    });

    n.isDead = true;
    n.pop = 0;
    n.soldiers = 0;
}

function simulateDomesticPolitics(n) {
    // 0. Approval Rating & Legislation Logic (New System)
    if (!n.lastGdp) n.lastGdp = n.gdp;
    
    // Approval Drift
    let targetApproval = 50;
    if (n.gdp > n.lastGdp) targetApproval += 10;
    if (n.stability > 80) targetApproval += 10;
    if (n.stability < 40) targetApproval -= 20;
    if (n.unrest > 20) targetApproval -= n.unrest / 2;
    
    n.president.approval += (targetApproval - n.president.approval) * 0.05;
    n.president.approval = clamp(n.president.approval, 0, 100);
    n.lastGdp = n.gdp;

    // Check Divided Government
    const rulingParty = n.parties.find(p => p.name === n.president.party);
    const isDivided = rulingParty ? (rulingParty.seats < n.parliamentSize / 2) : false;
    n.isDividedGovernment = isDivided;

    // Legislation Attempt (Quarterly: once every ~3 ticks assuming sim speed)
    // Actually run every tick with low probability
    let legChance = 0.05; 
    if (isDivided) legChance = 0.01; // Gridlock
    else legChance = 0.10; // Unified

    if (Math.random() < legChance && rulingParty) {
        // Successful Legislation
        const stats = rulingParty.stats;
        let passed = true;
        
        // Apply Effects
        if (stats) {
            n.stability = clamp(n.stability + stats.stab, 0, 100);
            n.gdp = Math.floor(n.gdp * (1 + stats.gdp * 0.005)); // Small compound growth
            n.industry += stats.gdp * 2;
            
            // Military / Tech
            if (stats.mil > 0) {
                n.soldiers += 500;
                n.tanks += 1;
            } else if (stats.mil < 0) {
                 n.soldiers = Math.max(0, n.soldiers - 500);
            }
            
            if (stats.tech > 0 && Math.random() < stats.tech) {
                 // Research boost
                 n.industry += 1;
            }
        }
        
        n.president.approval = clamp(n.president.approval + 1, 0, 100);
        // Log occasionally
        if (Math.random() < 0.1) {
            log(`政策通過: ${rulingParty.name}主導の法案が可決されました。(支持率: ${n.president.approval.toFixed(1)}%)`, "log-peace");
        }
    } else if (isDivided && Math.random() < 0.02) {
        // Gridlock Event
        n.president.approval = clamp(n.president.approval - 2, 0, 100);
        n.stability = clamp(n.stability - 1, 0, 100);
        log(`政治的膠着: ねじれ国会により法案が廃案となりました。(支持率: ${n.president.approval.toFixed(1)}%)`, "log-war");
    }

    // 1. Local & National Support Fluctuation
    
    // a. Update City Level Support
    n.cities.forEach(city => {
        let total = 0;
        n.parties.forEach(p => {
            let current = city.partySupport[p.name] || 0;
            // Random drift
            let change = (Math.random() - 0.5) * 4; 
            // Regional events or trends could go here
            city.partySupport[p.name] = Math.max(0, current + change);
            total += city.partySupport[p.name];
        });
        // Normalize city support
        n.parties.forEach(p => {
            city.partySupport[p.name] = (city.partySupport[p.name] / total) * 100;
        });
    });

    // b. Calculate National Average (Population Weighted - Simplified to City Average for now)
    // To be precise we should weight by city size, but uniform is ok for this level of sim.
    let nationalSums = {};
    n.parties.forEach(p => nationalSums[p.name] = 0);
    
    n.cities.forEach(city => {
        n.parties.forEach(p => {
            nationalSums[p.name] += city.partySupport[p.name];
        });
    });
    
    n.parties.forEach(p => {
        if (n.cities.length > 0) {
            p.support = nationalSums[p.name] / n.cities.length;
        }
    });

    // c. Record History
    if (year % 1 === 0) { // Record every year
        let historyEntry = { year: year, parties: [] };
        n.parties.forEach(p => {
            historyEntry.parties.push({ name: p.name, color: p.color, support: p.support });
        });
        n.supportHistory.push(historyEntry);
        // Keep last 100 years
        if (n.supportHistory.length > 100) n.supportHistory.shift();
    }

    // 2. Random Events (Enhanced)
    if (Math.random() < 0.03) {
        const events = [
            { msg: "経済ブーム！大統領の支持率が上昇。", target: "approval", effect: 5, type: "good" },
            { msg: "不景気の波。大統領の支持率が低下。", target: "approval", effect: -5, type: "bad" },
            { msg: "政治スキャンダル発覚。政権への信頼が揺らいでいます。", target: "approval", effect: -8, type: "bad" },
            { msg: "大規模な抗議デモが発生。国内が不安定化しています。", target: "stability", effect: -10, type: "bad" },
            { msg: "新技術の導入により国力が増大。", target: "gdp", effect: n.gdp * 0.05, type: "good" }
        ];

        // Specific Hardcore Events
        if (Math.random() < 0.1) {
            events.push({ msg: "最高裁判事の空席が発生。後任指名を巡り対立が激化。", target: "stability", effect: -15, type: "bad" });
        }
        if (n.isDividedGovernment && Math.random() < 0.2) {
            events.push({ msg: "予算不成立の危機！政府閉鎖の懸念が高まっています。", target: "approval_gdp", effect: -10, type: "bad" });
        }
        if (n.stability < 50 && Math.random() < 0.1) {
            events.push({ msg: "州レベルでの離脱運動が観測されています。", target: "stability", effect: -5, type: "bad" });
        }

        const evt = events[Math.floor(Math.random() * events.length)];
        
        // Identify ruling party
        let rulingParty = n.parties.find(p => p.name === n.president.party);
        if (!rulingParty) rulingParty = n.parties[0];

        if (evt.target === "approval") {
            n.president.approval += evt.effect;
            log(`国内ニュース: ${evt.msg} (支持率: ${n.president.approval.toFixed(1)}%)`, evt.type === "good" ? "log-peace" : "log-war");
        } else if (evt.target === "stability") {
            n.stability = clamp(n.stability + evt.effect, 0, 100);
            log(`国内ニュース: ${evt.msg}`, "log-war");
        } else if (evt.target === "gdp") {
            n.gdp += evt.effect;
            n.president.approval += 2;
            log(`国内ニュース: ${evt.msg}`, "log-peace");
        } else if (evt.target === "approval_gdp") {
            n.president.approval += evt.effect;
            n.gdp = Math.floor(n.gdp * 0.98); // 2% loss
            log(`政治危機: ${evt.msg}`, "log-war");
        }
        
        // Clamp Approval
        n.president.approval = clamp(n.president.approval, 0, 100);
        
        // Slight Party Support Shift based on event sentiment
        if (evt.type === "good") rulingParty.support += 1;
        else rulingParty.support -= 1;
    }

    // 3. Elections
    
    // Midterm Elections
    if (year === n.midtermYear) {
        log(`中間選挙: 国民の信を問う時が来ました。(大統領支持率: ${n.president.approval.toFixed(1)}%)`, "log-info");
        n.midtermYear = year + 4;
        
        // Swing Calculation based on Approval
        // e.g. Approval 40% -> -5% support swing against ruling party
        let swing = (n.president.approval - 50) * 0.5; 
        
        // Apply swing to seat calculation (Temporary for seat allocation)
        let totalSeats = n.parliamentSize;
        let tempSupport = {};
        let totalTempSupport = 0;
        
        n.parties.forEach(p => {
            let s = p.support;
            if (p.name === n.president.party) s += swing;
            else s -= (swing / (n.parties.length - 1));
            
            s = Math.max(0, s);
            tempSupport[p.name] = s;
            totalTempSupport += s;
        });
        
        // Assign Seats
        let remaining = totalSeats;
        n.parties.forEach(p => {
            let ratio = tempSupport[p.name] / totalTempSupport;
            let seats = Math.floor(ratio * totalSeats);
            p.seats = seats;
            remaining -= seats;
        });
        
        // Give remainder to party with highest temp support
        let winner = n.parties.reduce((prev, curr) => tempSupport[prev.name] > tempSupport[curr.name] ? prev : curr);
        winner.seats += remaining;
        
        let resultMsg = swing > 0 ? "与党が議席を維持・拡大しました。" : "与党が議席を減らしました。";
        log(`中間選挙結果: ${resultMsg}`, "log-peace");
    }

    // Presidential Elections
    if (year >= n.electionYear) {
        log(`大統領選挙: 選挙の年がやってきました！`, "log-info");
        n.electionYear = year + 4;
        
        // 1. Concurrent Congressional Election (Base support, separate from Midterm swing)
        // Reset seats based on current actual support (which drifts over time)
        let remainingSeats = n.parliamentSize;
        n.parties.forEach(p => {
            let seats = Math.floor((p.support / 100) * n.parliamentSize);
            p.seats = seats;
            remainingSeats -= seats;
        });
        let seatWinner = n.parties.reduce((prev, current) => (prev.support > current.support) ? prev : current);
        seatWinner.seats += remainingSeats;

        // 2. Electoral College (Presidential)
        let evResults = {};
        let totalEV = 0;
        n.parties.forEach(p => evResults[p.name] = 0);
        
        n.cities.forEach(city => {
            let cityWinner = null;
            let maxSupport = -1;
            // Find local winner
            n.parties.forEach(p => {
                let support = city.partySupport[p.name] || 0;
                if (support > maxSupport) {
                    maxSupport = support;
                    cityWinner = p;
                }
            });
            
            if (cityWinner) {
                let ev = city.electoralVotes || 3;
                evResults[cityWinner.name] += ev;
                totalEV += ev;
            }
        });
        
        // Find Winner
        let presWinnerName = Object.keys(evResults).reduce((a, b) => evResults[a] > evResults[b] ? a : b);
        let presWinnerParty = n.parties.find(p => p.name === presWinnerName);
        let winnerEV = evResults[presWinnerName];
        
        // Term Logic
        let newPresName = "";
        let isReelection = false;
        
        if (n.president.party === presWinnerName && n.president.term < 2) {
            // Re-elected
            newPresName = n.president.name;
            n.president.term++;
            isReelection = true;
        } else {
            // New President (Term limit or Party change)
            newPresName = n.generateLeaderName();
            n.president.term = 1;
        }
        
        // Update President
        n.president.name = newPresName;
        n.president.party = presWinnerName;
        n.president.ideology = presWinnerParty.ideology;
        n.president.approval = 55; // Reset approval (Honeymoon)
        n.leader = newPresName;

        log(`大統領選結果: ${presWinnerName}が勝利しました (獲得選挙人: ${winnerEV}/${totalEV})。${newPresName}が大統領に就任。`, "log-peace");
        n.addHistory(`選挙: ${presWinnerName}勝利 (${winnerEV}EV), ${newPresName}就任`);
    }
}

function simulateTick() {
    // 民主主義の目覚めイベントのチェック
    if (!isDemocracyAwakened) {
        let maxTech = 0;
        nations.forEach(n => { if (!n.isDead && n.tech > maxTech) maxTech = n.tech; });
        if (maxTech >= 2 || year >= 1700) {
            isDemocracyAwakened = true;
            log("歴史的転換点: 「民主主義の目覚め」！ 民衆が自らの権利を主張し始め、共和制や立憲君主制の思想が広まりました。", "log-peace");
        }
    }

    // 社会主義の芽生えイベントのチェック
    if (!isSocialismSprouted) {
        let maxTech = 0;
        nations.forEach(n => { if (!n.isDead && n.tech > maxTech) maxTech = n.tech; });
        if (maxTech >= 2 || year >= 1848) {
            isSocialismSprouted = true;
            log("歴史的転換点: 「社会主義の芽生え」！ 工業化の進展と共に労働者が団結し、社会主義・共産主義の思想が広まり始めました。", "log-peace");
        }
    }

    updateMilitaryGrid();
    if (mapDirty) {
        updateContinents();
        mapDirty = false;
    }

    // 徹底抗戦モードのゲームオーバー判定
    if (activeScenario === 'TOTALLER_KRIEG') {
        const axis = nations.find(n => n.name === '枢軸国');
        const allies = nations.find(n => n.name === '連合国');
        
        if (axis && (axis.isDead || axis.isPuppet)) {
            isPaused = true;
            alert(`徹底抗戦終了: 枢軸国は降伏しました。\n生存期間: ${year}年`);
            return;
        } else if (allies && (allies.isDead || allies.isPuppet)) {
            isPaused = true;
            alert(`徹底抗戦終了: 連合国は降伏しました。\n枢軸国の勝利です！ (生存期間: ${year}年)`);
            return;
        }
    }

    let totalPop = 0;
    let totalLandTiles = 0;
    for(let i=0; i<grid.length; i++) if(grid[i] !== 0) totalLandTiles++;

    // 緊張感の自然減衰
    worldTension = Math.max(0, worldTension - 0.2);

    // 長期高緊張による厭戦
    if (worldTension > 90) {
        highTensionDuration++;
    } else {
        highTensionDuration = 0;
    }

    let tensionThreshold = (activeScenario === 'QUIET_SPARKS') ? 10 : 1000;
    if (highTensionDuration > tensionThreshold && activeScenario !== 'TOTALLER_KRIEG') {
        // 全世界的な和平交渉 (必ずしも平和にはならない)
        let eventName = (activeScenario === 'QUIET_SPARKS') ? "10年戦争の弊害" : "千年戦争の疲弊";
        log(`${eventName}: 世界中で厭戦気分が高まり、各国で和平交渉が開始されました。`, "log-peace");
        
        // 交渉済みペアを記録 (A-BとB-Aで二重処理しないため)
        const negotiatedPairs = new Set();

        nations.forEach(n => {
            if (!n.isDead && n.atWarWith.length > 0) {
                const enemies = [...n.atWarWith];
                enemies.forEach(eId => {
                    const pairKey = [n.id, eId].sort().join('-');
                    if (negotiatedPairs.has(pairKey)) return;
                    negotiatedPairs.add(pairKey);

                    const enemy = nations.find(e => e.id === eId);
                    if (enemy && !enemy.isDead) {
                        const nPow = n.getMilitaryPower();
                        const ePow = enemy.getMilitaryPower();
                        const ratio = nPow > ePow ? nPow / ePow : ePow / nPow;
                        const isNStronger = nPow > ePow;
                        const strong = isNStronger ? n : enemy;
                        const weak = isNStronger ? enemy : n;

                        if (ratio > 1.5) {
                            // 一方が有利な場合
                            const rand = Math.random();
                            if (rand < 0.6) {
                                // 有利な条件で講和
                                concludePeace(strong, weak, 'PARTIAL_PEACE');
                            } else if (rand < 0.8) {
                                // 痛み分け
                                concludePeace(strong, weak, 'WHITE_PEACE');
                            } else {
                                // 交渉決裂 (継戦)
                                log(`交渉決裂: ${strong.name}は${weak.name}への要求を譲らず、戦争は継続されます。`, "log-war");
                            }
                        } else {
                            // 膠着状態
                            const rand = Math.random();
                            if (rand < 0.8) {
                                // 疲弊して停戦
                                concludePeace(n, enemy, 'WHITE_PEACE');
                            } else {
                                // 意地の張り合い
                                log(`交渉決裂: ${n.name}と${enemy.name}は互いに譲歩せず、泥沼の戦いが続きます。`, "log-war");
                            }
                        }
                    }
                });
            }
        });
        highTensionDuration = 0;
        worldTension = Math.max(0, worldTension - 30); // 緊張緩和するが完全平和ではない
    }

    // Update alliance centroids for rendering
    alliances.forEach(a => a.updateCentroid());

    // 1. 内政フェーズ
    nations.forEach(n => {
        if (n.isDead) return;
        
        handlePolitics(n);

        // 未開拓地の植民
        const colonizationChance = 0.01 + (n.tech * 0.02); // 1% to 9% depending on tech
        if (n.tech >= 1 && Math.random() < colonizationChance) { 
            // ランダムに領土をピックして、隣接する未開拓地(ownerGrid == -1)を探す
            const sampleTiles = [];
            for(let i=0; i<10; i++) {
                if (n.tiles.length > 0) {
                    sampleTiles.push(n.tiles[Math.floor(Math.random() * n.tiles.length)]);
                }
            }
            
            for(const tIdx of sampleTiles) {
                const cx = tIdx % width;
                const cy = Math.floor(tIdx / width);
                let done = false;
                
                const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
                // ランダムな順序で試す
                neighbors.sort(() => Math.random() - 0.5);

                for(const [dx, dy] of neighbors) {
                    let nx=cx+dx, ny=cy+dy;
                    if(nx>=0 && nx<width && ny>=0 && ny<height) {
                        let nIdx = ny*width+nx;
                        if(ownerGrid[nIdx] === -1 && (grid[nIdx] === 1 || grid[nIdx] === 2)) { // 未所属の陸地または山岳
                            ownerGrid[nIdx] = n.id;
                            n.tiles.push(nIdx);
                            // コスト
                            n.gdp = Math.max(0, n.gdp - 5);
                            done = true;
                            break;
                        }
                    }
                }
                if(done) break;
            }
        }

        // 都市の建設
        if (n.tiles.length > (n.cities.length + 1) * 50 && Math.random() < 0.05) {
            const potentialTiles = n.tiles.filter(t => !n.cities.some(c => c.tileIdx === t));
            if (potentialTiles.length > 0) {
                const newTile = potentialTiles[Math.floor(Math.random() * potentialTiles.length)];
                const cityName = n.generateCityName();
                n.cities.push(new City(cityName, newTile, n.id));
                log(`${n.name}が新たな都市「${cityName}」を建設しました。`, "log-info");
            }
        }

        // 人口増加: 領土面積と技術に基づくロジスティック回帰モデル
        let capacity = n.tiles.length * 1000 * (1 + n.tech * 0.5);
        let growth = 0.02 * (1 - n.pop / capacity);
        if (growth < -0.01) growth = -0.01; // 急激な減少を抑える
        n.pop = Math.floor(n.pop * (1 + growth));
        
        // GDP成長: 工業力と人口、技術（人口依存度を下げる）
        n.gdp += (n.industry * 2) + (n.pop * 0.002) * (1 + n.tech);
        
        // 軍備増強: GDPの一部を軍事費へ
        let milBudget = n.gdp * 0.1;
        if (n.atWarWith.length > 0) milBudget = n.gdp * 0.3; // 戦時体制

        // 兵士雇用 / 維持
        let desiredSoldiers = Math.floor(n.pop * 0.05); // 人口の5%が上限目安
        if (n.soldiers < desiredSoldiers && milBudget > 0) {
            n.soldiers += 10;
            milBudget -= 10;
        }
        
        // 技術発展 / 戦車製造
        if (n.tech < 4 && Math.random() < 0.01) {
            let nextTech = n.tech + 1;
            let requiredYear = 0;
            if (nextTech === 1) requiredYear = 0;
            else if (nextTech === 2) requiredYear = 1700;
            else if (nextTech === 3) requiredYear = 1900;
            else if (nextTech === 4) requiredYear = 2020;
            
            if (n.gdp > 3000 * (n.tech + 1) && year >= requiredYear) {
                n.tech++;
                log(`${n.name}の技術レベルが「${TECH_LEVELS[n.tech]}」に向上しました！`, "log-info");
            }
        }
        if (n.tech >= 2 && milBudget > 100) {
            n.tanks++;
            milBudget -= 50;
        }
        
        // 海軍建造 (技術レベル2以上かつ海岸線がある場合)
        if (n.tech >= 2 && milBudget > 150 && n.isCoastal()) {
            n.ships++;
            milBudget -= 100;
        }

        // 重心計算
        n.updateCentroid();

        totalPop += n.pop;
    });
    document.getElementById('info-pop').innerText = formatNum(totalPop);

    // 2. 外交フェーズ / 国内政治フェーズ
    if (activeScenario === 'GRACEFUL_US') {
        const us = nations[0];
        if (us && !us.isDead) {
            simulateDomesticPolitics(us);
        }
        // Skip normal diplomacy
        return; 
    }

    // 国際機関の管理と効果
    manageInternationalOrganizations();

    // インターナショナルの管理
    manageTheInternational();

    // 連合国（非社会主義・民主主義国家同盟）の管理
    manageAlliedNations();

    hegemonId = -1;
    let maxScore = -1;
    nations.forEach(n => {
        if (!n.isDead) {
            // Calculate total power including puppets
            let totalGdp = n.gdp;
            let totalPop = n.pop;
            let totalMil = n.getMilitaryPower();
            let totalTiles = n.tiles.length;

            if (!n.isPuppet) {
                nations.forEach(p => {
                    if (p.isPuppet && p.masterId === n.id && !p.isDead) {
                        totalGdp += p.gdp;
                        totalPop += p.pop;
                        totalMil += p.getMilitaryPower();
                        totalTiles += p.tiles.length;
                    }
                });
            }

            // Score = GDP + (Pop/100) + (Mil*10) + (Tiles*50)
            const score = totalGdp + (totalPop / 100) + (totalMil * 10) + (totalTiles * 50);
            if (score > maxScore) {
                maxScore = score;
                hegemonId = n.id;
            }
        }
    });

    hegemonStatus = "";
    if (hegemonId !== -1) {
        const h = nations.find(n => n.id === hegemonId);
        if (h && totalLandTiles > 0) {
             // Calculate total tiles including puppets for hegemony status
             let totalHegemonTiles = h.tiles.length;
             nations.forEach(p => {
                 if (p.isPuppet && p.masterId === h.id && !p.isDead) {
                     totalHegemonTiles += p.tiles.length;
                 }
             });

             const ratio = totalHegemonTiles / totalLandTiles;
             // ユーザー要望により閾値を緩和
             if (ratio >= 0.50) hegemonStatus = "秩序維持国";
             else if (ratio >= 0.30) hegemonStatus = "世界覇権国";
             else if (ratio >= 0.10) hegemonStatus = "地域覇権国";
             else hegemonStatus = "列強";
        } else {
             hegemonStatus = "列強";
        }
    }

    // 連邦・合衆国の形成 (上位3カ国以外が対象、脅威に対抗)
    if (worldTension > 50 || hegemonId !== -1) {
        // スコア順にソートして上位3つを特定
        const sortedNations = nations.filter(n => !n.isDead).map(n => {
             // 簡易スコア計算
             const s = n.gdp + (n.pop/100) + (n.getMilitaryPower()*10) + (n.tiles.length*50);
             return { id: n.id, score: s };
        }).sort((a,b) => b.score - a.score);
        
        const top3Ids = sortedNations.slice(0, 3).map(d => d.id);

        // ランダムに1カ国選んで合併判定
        const potentialMergers = nations.filter(n => !n.isDead && !n.isPuppet && !top3Ids.includes(n.id));
        if (potentialMergers.length > 0) {
            const n1 = potentialMergers[Math.floor(Math.random() * potentialMergers.length)];
            
            // 同じ宗教を持つ隣接国を探す
            // 重いので簡易チェック (全探索せず、neighborsリストもないので、数回サンプリング)
            for (let i = 0; i < 20; i++) {
                if (n1.tiles.length === 0) break;
                const tile = n1.tiles[Math.floor(Math.random() * n1.tiles.length)];
                const cx = tile % width;
                const cy = Math.floor(tile / width);
                let neighborId = -1;
                
                [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
                    let nx=cx+dx, ny=cy+dy;
                    if(nx>=0 && nx<width && ny>=0 && ny<height) {
                        let nIdx = ny*width+nx;
                        if(ownerGrid[nIdx] !== -1 && ownerGrid[nIdx] !== n1.id) {
                            neighborId = ownerGrid[nIdx];
                        }
                    }
                });

                if (neighborId !== -1) {
                    const n2 = nations.find(n => n.id === neighborId);
                    if (n2 && !n2.isDead && !n2.isPuppet && !top3Ids.includes(n2.id)) {
                        if (n1.religion === n2.religion && !n1.atWarWith.includes(n2.id)) {
                            // 合併実行 (低確率)
                            let mergerChance = 0.005;
                            if (activeScenario === 'QUIET_SPARKS') mergerChance = 0.0005;

                            if (Math.random() < mergerChance) {
                                log(`連邦形成: 共通の脅威に対抗するため、${n1.name}と${n2.name}は${n1.religion}の旗印のもとに統合しました！`, "log-peace");
                                n1.addHistory(`連邦形成: ${n2.name}と統合`);
                                n2.addHistory(`連邦形成: ${n1.name}と統合`);

                                // n2をn1に吸収
                                const n2Tiles = [...n2.tiles];
                                n2Tiles.forEach(t => {
                                    ownerGrid[t] = n1.id;
                                    n1.tiles.push(t);
                                });
                                n2.tiles = [];

                                n2.cities.forEach(c => {
                                    c.nationId = n1.id;
                                    n1.cities.push(c);
                                });
                                n2.cities = [];

                                n1.gdp += n2.gdp;
                                n1.pop += n2.pop;
                                n1.soldiers += n2.soldiers;
                                n1.tanks += n2.tanks;
                                n1.ships += n2.ships;

                                n2.isDead = true;
                                n2.pop = 0;

                                // 体制変更と改名
                                n1.stateStruct = '連邦国家';
                                // 民主主義なら確率で合衆国化（大統領制へ）、それ以外は連邦共和国（議院内閣制など）
                                if (n1.sysBroad === '民主主義') {
                                    if (Math.random() < 0.2) {
                                        // 20%の確率で合衆国 (United States)
                                        n1.sysDetailed = '大統領制';
                                        n1.govType = '大統領制';
                                    } else {
                                        // 80%の確率で連邦共和国 (Federation) - 議院内閣制をベースにする
                                        n1.sysDetailed = '議院内閣制';
                                        n1.govType = '議院内閣制';
                                    }
                                }
                                
                                n1.updateName();
                                n1.stability = Math.min(100, n1.stability + 20); // 結束による安定化
                                
                                // 戦争状態の引継ぎ
                                n2.atWarWith.forEach(eid => {
                                    if (!n1.atWarWith.includes(eid)) {
                                        n1.atWarWith.push(eid);
                                        const enemy = nations.find(e => e.id === eid);
                                        if (enemy && !enemy.atWarWith.includes(n1.id)) enemy.atWarWith.push(n1.id);
                                    }
                                });

                                break; // 1ターンに1回のみ
                            }
                        }
                    }
                }
            }
        }
    }

    nations.forEach(n => {
        if (n.isDead) return;

        // 覇権国（秩序維持国）の場合、秩序維持モード
        if (n.id === hegemonId && hegemonStatus === "秩序維持国") {
            // 他国の戦争に介入して停戦させる (仲介)
            nations.forEach(other => {
                if (other.id !== n.id && !other.isDead && other.atWarWith.length > 0) {
                    // 自分との戦争は除く
                    const enemies = other.atWarWith.filter(eId => eId !== n.id);
                    enemies.forEach(eId => {
                        const enemy = nations.find(en => en.id === eId);
                        if (enemy && !enemy.isDead) {
                            // 強制的に白紙講和
                            // Log only once per pair (check if they are still at war)
                            if (other.atWarWith.includes(eId)) {
                                concludePeace(other, enemy, 'WHITE_PEACE');
                                log(`秩序維持: 覇権国${n.name}の仲介により、${other.name}と${enemy.name}は停戦しました。`, "log-peace");
                            }
                        }
                    });
                }
            });
            
            // 覇権国（秩序維持国）は自ら宣戦布告しない（反乱鎮圧などは除く）
            return;
        }

        // 外交併合: 傀儡国を併合
        if (!n.isPuppet) {
            const myPuppets = nations.filter(p => p.isPuppet && p.masterId === n.id && !p.isDead);
            myPuppets.forEach(p => {
                // 10年以上経過かつ宗主国の安定度が高い場合
                if (year - p.puppetSince > 10 && n.stability > 70 && Math.random() < 0.005) {
                    log(`外交併合: ${n.name}は長年の属国である${p.name}を完全に併合しました。`, "log-peace");
                    n.addHistory(`外交併合: ${p.name}を統合`);
                    
                    // 領土統合
                    const pTiles = [...p.tiles];
                    pTiles.forEach(t => {
                        ownerGrid[t] = n.id;
                        n.tiles.push(t);
                    });
                    p.tiles = [];
                    
                    // 都市統合
                    p.cities.forEach(c => {
                        c.nationId = n.id;
                        n.cities.push(c);
                    });
                    p.cities = [];

                    p.isDead = true;
                    p.pop = 0;
                    n.stability = Math.min(100, n.stability + 10);
                }
            });
        }
        
        // 対象国を選ぶ (20%の確率で最も親密な国、80%でランダム)
        let target;
        if (Math.random() < 0.2) {
            let bestRel = -101;
            let bestTarget = null;
            nations.forEach(other => {
                if (other.id !== n.id && !other.isDead) {
                    const rel = n.relations[other.id] || 0;
                    if (rel > bestRel) {
                        bestRel = rel;
                        bestTarget = other;
                    }
                }
            });
            target = bestTarget;
        } else {
            target = nations[Math.floor(Math.random() * nations.length)];
        }
        
        if (!target || target.id === n.id || target.isDead) return;

        // 関係値初期化
        if (n.relations[target.id] === undefined) n.relations[target.id] = 0;

        // 同盟の形成と維持
        if (!n.isPuppet && !target.isPuppet) {
            // 自由主義国の判定 (民主主義または立憲君主制)
            const isLiberal = (nat) => (nat.sysBroad === '民主主義' || nat.sysDetailed === '立憲君主制');
            
            // 自由主義国が少ない場合の「連合国」結成ロジック
            const liberalNations = nations.filter(nat => !nat.isDead && isLiberal(nat));
            const totalNations = nations.filter(nat => !nat.isDead).length;
            const liberalRatio = liberalNations.length / (totalNations || 1);
            
            if (liberalRatio < 0.3 && isLiberal(n) && isLiberal(target)) {
                // 関係が良好なら「連合国」として結集しやすい
                if (!n.allies.includes(target.id) && n.relations[target.id] > 60 && !n.atWarWith.includes(target.id)) {
                    if (Math.random() < 0.2) {
                        const existingAllies = alliances.find(a => a.name === "連合国");
                        if (existingAllies) {
                            // 既存の「連合国」に加入
                            if (n.allianceId === -1 && target.allianceId === existingAllies.id) {
                                formAlliance(n, target);
                            } else if (target.allianceId === -1 && n.allianceId === existingAllies.id) {
                                formAlliance(n, target);
                            } else if (n.allianceId === -1 && target.allianceId === -1) {
                                // 両方未加入なら片方を加入させてからもう片方を呼ぶ (formAllianceの仕様に合わせる)
                                formAlliance(n, target);
                                const newA = alliances.find(a => a.members.includes(n.id) && a.members.includes(target.id));
                                if (newA) newA.name = "連合国";
                            } else {
                                formAlliance(n, target);
                            }
                        } else {
                            // 新規に「連合国」を結成
                            formAlliance(n, target);
                            const newA = alliances.find(a => a.members.includes(n.id) && a.members.includes(target.id));
                            if (newA) {
                                newA.name = "連合国";
                                log(`自由主義の危機: ${n.name}と${target.name}は自由を守るため「連合国」を結成しました。`, "log-peace");
                            }
                        }
                    }
                }
            }

            // 共通の敵がいるかチェック
            let commonEnemy = false;
            n.atWarWith.forEach(e => {
                if (target.atWarWith.includes(e)) commonEnemy = true;
            });

            // 同盟形成 (高関係かつ未同盟)
            const relThreshold = commonEnemy ? 70 : 80;
            if (!n.allies.includes(target.id) && n.relations[target.id] > relThreshold && !n.atWarWith.includes(target.id)) {
                let chance = commonEnemy ? 0.15 : 0.02;
                if (Math.random() < chance) {
                    formAlliance(n, target);
                }
            }
            
            // 同盟破棄 (関係悪化)
            if (n.allies.includes(target.id)) {
                if (n.relations[target.id] < 0 || n.atWarWith.includes(target.id)) {
                    breakAlliance(n, target);
                }
            }
        }

        // 関係変動要因 (より過激に)
        let change = (Math.random() - 0.5) * 5; 
        if (n.religion === target.religion) change += 5;
        else change -= 5;

        // 政治体制が同じなら親近感
        if (n.sysBroad === target.sysBroad) change += 3;

        // 同じ国際機構に加盟していれば親近感
        const sameOrg = organizations.some(org => org.members.includes(n.id) && org.members.includes(target.id));
        if (sameOrg) change += 2;
        
        // Grand Empire: Hated by everyone
        if (n.isGrandEmpire) change -= 2.0;

        // 世界の緊張感による悪化
        change -= (worldTension / 20);
        
        // 隣接していると摩擦が起きやすい
        let neighbor = isNeighbor(n, target);
        if (neighbor) change -= 3;

        // ボーダーインシデント (突発的な悪化)
        if (neighbor && Math.random() < 0.05) {
            change -= 40;
            log(`偶発的衝突: ${n.name}と${target.name}の間で緊張が高まっています！`, "log-war");
        }

        n.relations[target.id] = clamp(n.relations[target.id] + change, -100, 100);

        // 戦争判定 (閾値を下げ、好戦的に)
        // 隣接しているか、あるいは海軍力があり両者が沿岸国であれば宣戦布告可能
        const canNavalInvade = (n.tech >= 3 && n.ships >= 20 && n.isCoastal() && target.isCoastal());

        // 経済大国(GDP>3000かつ自国の1.5倍以上)への攻撃は、軍事大国(軍事力1.5倍)か野心(帝国)、あるいは激怒(関係<-90)が必要
        if (target.gdp > 3000 && target.gdp > n.gdp * 1.5) {
             const isMilSuper = n.getMilitaryPower() > target.getMilitaryPower() * 1.5;
             // 攻撃側が軍事大国でもなく、野心的な帝国でもなく、関係が最悪でもない場合は戦争を回避
             if (!isMilSuper && !n.isGrandEmpire && n.relations[target.id] > -90) {
                 return; 
             }
        }

        // 民主主義国同士の平和 (Democratic Peace Theory)
        // 双方が民主主義の場合、よほどの対立(関係<-80)や野心がない限り戦争を回避する
        if (n.sysBroad === '民主主義' && target.sysBroad === '民主主義') {
            if (n.relations[target.id] > -80 && !n.isGrandEmpire) {
                return;
            }
        }
        
        let warThreshold = -50;
        let isColdWar = false;

        if (activeScenario === 'QUIET_SPARKS') {
            warThreshold = -70; 
            
            const isMajor = n.tiles.length > 50 || n.gdp > 2000;
            const targetIsMajor = target.tiles.length > 50 || target.gdp > 2000;

            if (isMajor) {
                warThreshold = -85;
                if (targetIsMajor) {
                     warThreshold = -95;
                     isColdWar = true;
                }
            }
        }

        if (n.relations[target.id] < warThreshold && (neighbor || canNavalInvade)) {
            if (!n.atWarWith.includes(target.id)) {
                // 傀儡国は主人に逆らわない
                if (n.isPuppet && n.masterId === target.id) return;
                // 主人は傀儡国を攻撃しない
                if (target.isPuppet && target.masterId === n.id) return;
                // 同盟国には攻撃しない (関係が極悪でない限り)
                if (n.allies.includes(target.id) && n.relations[target.id] > -50) return;

                declareWar(n, target);
            }
        } else if (activeScenario === 'QUIET_SPARKS' && isColdWar && n.relations[target.id] < -60 && (neighbor || canNavalInvade)) {
             // Cold War Tension
             if (!n.atWarWith.includes(target.id) && Math.random() < 0.005) {
                 worldTension = Math.min(100, worldTension + 0.5);
             }
        }

        // 野心による開戦 (圧倒的有利な場合)
        let ambitionThreshold = 2.0;
        let ambitionChance = 0.05;
        if (n.isGrandEmpire) {
            ambitionThreshold = 1.2;
            ambitionChance = 0.2; // Very aggressive
        }

        if (activeScenario === 'QUIET_SPARKS') {
            ambitionChance /= 5;
            ambitionThreshold += 1.0;
        }

        if ((neighbor || canNavalInvade) && n.getMilitaryPower() > target.getMilitaryPower() * ambitionThreshold && Math.random() < ambitionChance) {
            if (!n.atWarWith.includes(target.id)) {
                // 傀儡国は主人に逆らわない
                if (n.isPuppet && n.masterId === target.id) return;
                // 主人は傀儡国を攻撃しない
                if (target.isPuppet && target.masterId === n.id) return;
                // 同盟国には攻撃しない
                if (n.allies.includes(target.id)) return;

                log(`野心: ${n.name}は${target.name}への領土拡大の好機を見出しました！`, "log-war");
                declareWar(n, target);
            }
        }
        // 和平判定
        else if (n.atWarWith.includes(target.id)) {
            let peaceChance = 0.005; // 基礎和平確率
            if (n.relations[target.id] > -20) peaceChance += 0.02;
            
            // 地形による和平確率の上昇 (山や川が境界だと膠着しやすい)
            const comp = getBoundaryComposition(n, target);
            let roughTerrainRatio = 0;
            if (comp.total > 0) {
                roughTerrainRatio = (comp.mountain + comp.river) / comp.total;
                if (roughTerrainRatio > 0.4) {
                    peaceChance += 0.05; // 境界の40%以上が険しい地形で和平しやすくなる
                }
            }

            if (Math.random() < peaceChance) {
                // 終戦形式の決定
                const nPow = n.getMilitaryPower();
                const tPow = target.getMilitaryPower();
                const ratio = nPow / tPow;

                if (ratio > 5 || ratio < 0.2) {
                    // 一方が圧倒的
                    const loser = ratio > 5 ? target : n;
                    if (loser.stability < 40 || loser.cities.length <= 2) {
                        concludePeace(n, target, 'PUPPET');
                    } else {
                        concludePeace(n, target, 'PARTIAL_PEACE');
                    }
                } else if (ratio > 2.5 || ratio < 0.4) {
                    // 優勢 -> 国境割譲 または 都市割譲
                    if (Math.random() < 0.6) {
                        concludePeace(n, target, 'ANNEX_BORDER');
                    } else {
                        concludePeace(n, target, 'PARTIAL_PEACE');
                    }
                } else if (roughTerrainRatio > 0.6) {
                    // 地形による膠着
                    concludePeace(n, target, 'WHITE_PEACE');
                } else {
                    concludePeace(n, target, 'DEFAULT');
                }
            }
        }
    });

    // 3. 戦争フェーズ
    nations.forEach(attacker => {
        if (attacker.isDead) return;
        
        attacker.atWarWith.forEach(enemyId => {
            const defender = nations.find(n => n.id === enemyId);
            if (!defender || defender.isDead) return;

            // 戦闘処理
            if (isNeighbor(attacker, defender)) {
                battle(attacker, defender);
            } else {
                // 非隣接国への上陸作戦
                if (attacker.tech >= 3 && Math.random() < 0.1) {
                    navalLanding(attacker, defender);
                }
            }
        });
    });
    
    // 滅亡判定
    nations.forEach(n => {
        if (!n.isDead && n.tiles.length === 0) {
            n.isDead = true;
            log(`${n.name}が滅亡しました！`, "log-war");
            // 戦争状態解除
            nations.forEach(other => {
                other.atWarWith = other.atWarWith.filter(id => id !== n.id);
            });
        }
    });
}

function formAlliance(n1, n2) {
    if (n1.allies.includes(n2.id)) return;
    
    // Legacy allies list
    n1.allies.push(n2.id);
    n2.allies.push(n1.id);

    if (n1.allianceId === -1 && n2.allianceId === -1) {
        // Create new alliance block
        const suffix = (n1.cultureType === 'KANJI' || n2.cultureType === 'KANJI') ? "条約機構" : " Pact";
        const allianceName = n1.baseName + "・" + n2.baseName + suffix;
        const newAlliance = new Alliance(allianceIdCounter++, allianceName, n1.id);
        newAlliance.members.push(n2.id);
        n1.allianceId = newAlliance.id;
        n2.allianceId = newAlliance.id;
        alliances.push(newAlliance);
        newAlliance.updateCentroid();
        log(`同盟結成: 新たな軍事ブロック「${allianceName}」が結成されました。`, "log-peace");
    } else if (n1.allianceId !== -1 && n2.allianceId === -1) {
        // n2 joins n1's alliance block
        const alliance = alliances.find(a => a.id === n1.allianceId);
        if (alliance) {
            alliance.members.forEach(mId => {
                const member = nations.find(m => m.id === mId);
                if (member && member.id !== n2.id) {
                    if (!member.allies.includes(n2.id)) member.allies.push(n2.id);
                    if (!n2.allies.includes(member.id)) n2.allies.push(member.id);
                }
            });
            alliance.members.push(n2.id);
            n2.allianceId = alliance.id;
            alliance.updateCentroid();
            alliance.addHistory(`${n2.name}が同盟に加入しました。`);
            log(`同盟加入: ${n2.name}が「${alliance.name}」に加入しました。`, "log-peace");
        }
    } else if (n1.allianceId === -1 && n2.allianceId !== -1) {
        // n1 joins n2's alliance block
        const alliance = alliances.find(a => a.id === n2.allianceId);
        if (alliance) {
            alliance.members.forEach(mId => {
                const member = nations.find(m => m.id === mId);
                if (member && member.id !== n1.id) {
                    if (!member.allies.includes(n1.id)) member.allies.push(n1.id);
                    if (!n1.allies.includes(member.id)) n1.allies.push(member.id);
                }
            });
            alliance.members.push(n1.id);
            n1.allianceId = alliance.id;
            alliance.updateCentroid();
            alliance.addHistory(`${n1.name}が同盟に加入しました。`);
            log(`同盟加入: ${n1.name}が「${alliance.name}」に加入しました。`, "log-peace");
        }
    } else {
        log(`同盟締結: ${n1.name}と${n2.name}は軍事同盟を締結しました。`, "log-peace");
    }
    
    n1.addHistory(`同盟: ${n2.name}と締結`);
    n2.addHistory(`同盟: ${n1.name}と締結`);
}

function breakAlliance(n1, n2) {
    if (!n1.allies.includes(n2.id)) return;
    n1.allies = n1.allies.filter(id => id !== n2.id);
    n2.allies = n2.allies.filter(id => id !== n1.id);
    
    // Handle Alliance block
    if (n1.allianceId !== -1 && n1.allianceId === n2.allianceId) {
        checkAllianceBlock(n1);
        checkAllianceBlock(n2);
    }

    log(`同盟破棄: ${n1.name}と${n2.name}の同盟関係は解消されました。`, "log-war");
    n1.addHistory(`同盟破棄: ${n2.name}との関係解消`);
    n2.addHistory(`同盟破棄: ${n1.name}との関係解消`);
}

function checkAllianceBlock(n) {
    if (n.allianceId === -1) return;
    const alliance = alliances.find(a => a.id === n.allianceId);
    if (!alliance) {
        n.allianceId = -1;
        return;
    }
    
    // Check if n has any other allies in the same alliance block
    const hasAlliesInBlock = alliance.members.some(mId => mId !== n.id && n.allies.includes(mId));
    
    if (!hasAlliesInBlock) {
        alliance.members = alliance.members.filter(mId => mId !== n.id);
        n.allianceId = -1;
        alliance.updateCentroid();
        alliance.addHistory(`${n.name}が同盟を離脱しました。`);
        log(`同盟離脱: ${n.name}が同盟ブロック「${alliance.name}」を離脱しました。`, "log-info");
        
        if (alliance.members.length <= 1) {
            if (alliance.members.length === 1) {
                const lastMember = nations.find(m => m.id === alliance.members[0]);
                if (lastMember) lastMember.allianceId = -1;
            }
            alliances = alliances.filter(a => a.id !== alliance.id);
            log(`同盟解散: 同盟ブロック「${alliance.name}」は解散しました。`, "log-info");
        }
    }
}

function manageInternationalOrganizations() {
    // 1. Create organizations if they don't exist
    if (organizations.length === 0 && year > 10) {
        const ecoOrg = new InternationalOrganization(orgIdCounter++, "世界貿易機構");
        organizations.push(ecoOrg);
        const sciOrg = new InternationalOrganization(orgIdCounter++, "国際科学評議会");
        organizations.push(sciOrg);
        log("国際社会の進展: 「世界貿易機構」および「国際科学評議会」が設立されました。", "log-peace");
    }

    // 2. Membership management and effects
    organizations.forEach(org => {
        nations.forEach(n => {
            if (n.isDead) return;

            const isMember = n.organizationIds.includes(org.id);

            if (!isMember) {
                // Join condition
                let joinChance = 0.001;
                if (org.name === "世界貿易機構" && n.gdp > 500) joinChance = 0.01;
                if (org.name === "国際科学評議会" && n.tech >= 2) joinChance = 0.01;

                if (Math.random() < joinChance) {
                    n.organizationIds.push(org.id);
                    org.members.push(n.id);
                    log(`${n.name}が国際機関「${org.name}」に加盟しました。`, "log-peace");
                }
            } else {
                // Member effects
                if (org.name === "世界貿易機構") {
                    n.gdp *= 1.001; // 0.1% GDP boost
                } else if (org.name === "国際科学評議会") {
                    if (Math.random() < 0.005) {
                        n.industry += 1;
                    }
                }

                // Leave condition (High tension or low stability)
                if (worldTension > 80 && Math.random() < 0.005) {
                    n.organizationIds = n.organizationIds.filter(id => id !== org.id);
                    org.members = org.members.filter(id => id !== n.id);
                    log(`${n.name}が国際機関「${org.name}」から脱退しました。`, "log-war");
                }
            }
        });
    });
}

function isNeighbor(n1, n2) {
    // 重いので簡易判定: 領土の中心距離などではなく、実際のグリッド走査は重すぎる。
    // ここでは「戦争中なら強制的に接触ありとみなす」または簡易的なランダムチェック
    // 正確にするなら境界線リストを持つべきだが、今回はランダムピックで代用
    for(let i=0; i<50; i++) {
        let tile = n1.tiles[Math.floor(Math.random() * n1.tiles.length)];
        if (tile === undefined) continue;
        let cx = tile % width;
        let cy = Math.floor(tile / width);
        let found = false;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            let nx=cx+dx, ny=cy+dy;
            if(nx>=0 && nx<width && ny>=0 && ny<height) {
                let nIdx = ny*width+nx;
                if(ownerGrid[nIdx] === n2.id) found = true;
            }
        });
        if(found) return true;
    }
    return false;
}

/**
 * 境界線の地形構成を取得
 */
function getBoundaryComposition(n1, n2) {
    let counts = {mountain: 0, river: 0, total: 0};
    const samples = Math.min(n1.tiles.length, 100);
    for(let i=0; i<samples; i++) {
        let tile = n1.tiles[Math.floor(Math.random() * n1.tiles.length)];
        if (tile === undefined) continue;
        let cx = tile % width;
        let cy = Math.floor(tile / width);
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            let nx=cx+dx, ny=cy+dy;
            if(nx>=0 && nx<width && ny>=0 && ny<height) {
                let nIdx = ny*width+nx;
                if(ownerGrid[nIdx] === n2.id) {
                    counts.total++;
                    const type = grid[nIdx];
                    if (type === 2) counts.mountain++;
                    else if (type === 3) counts.river++;
                }
            }
        });
    }
    return counts;
}

function declareWar(n1, n2) {
    if(n1.atWarWith.includes(n2.id)) return;
    n1.atWarWith.push(n2.id);
    if(!n2.atWarWith.includes(n1.id)) n2.atWarWith.push(n1.id);
    worldTension = Math.min(100, worldTension + 5);
    log(`戦争: ${n1.name}が${n2.name}に宣戦布告しました！（緊張度: ${worldTension.toFixed(1)}%）`, "log-war");
    n1.addHistory(`宣戦布告: 対${n2.name}`);
    n2.addHistory(`宣戦布告される: ${n1.name}より`);

    // 宗主国による防衛
    if (n2.isPuppet && n2.masterId !== -1) {
        const master = nations.find(m => m.id === n2.masterId);
        if (master && !master.isDead && master.id !== n1.id) {
            if (!master.atWarWith.includes(n1.id)) {
                 log(`${n2.name}の宗主国である${master.name}が保護義務を履行し、参戦しました。`, "log-war");
                 declareWar(master, n1);
            }
        }
    }

    // 傀儡国も参戦
    nations.forEach(puppet => {
        if (puppet.isPuppet && puppet.masterId === n1.id && !puppet.isDead) {
            if (!puppet.atWarWith.includes(n2.id)) {
                puppet.atWarWith.push(n2.id);
                if (!n2.atWarWith.includes(puppet.id)) n2.atWarWith.push(puppet.id);
                log(`${n1.name}の傀儡国、${puppet.name}が参戦しました。`, "log-war");
            }
        }
        if (puppet.isPuppet && puppet.masterId === n2.id && !puppet.isDead) {
            if (!puppet.atWarWith.includes(n1.id)) {
                puppet.atWarWith.push(n1.id);
                if (!n1.atWarWith.includes(puppet.id)) n1.atWarWith.push(puppet.id);
                log(`${n2.name}の傀儡国、${puppet.name}が参戦しました。`, "log-war");
            }
        }
    });

    // 同盟国の介入 (防御側n2の味方のみ)
    // n2の同盟国をチェック
    n2.allies.forEach(allyId => {
        const ally = nations.find(a => a.id === allyId);
        if (ally && !ally.isDead && !ally.atWarWith.includes(n1.id) && ally.id !== n1.id) {
            // 確率で参戦 (高い確率)
            if (Math.random() < 0.9) {
                let reason = `${n2.name}との同盟に基づき`;
                if (n2.allianceId !== -1 && n2.allianceId === ally.allianceId) {
                    const alliance = alliances.find(a => a.id === n2.allianceId);
                    if (alliance) reason = `同盟ブロック「${alliance.name}」の義務として`;
                }
                log(`同盟義務: ${ally.name}は${reason}、${n1.name}に宣戦布告しました！`, "log-war");
                declareWar(ally, n1);
            } else {
                log(`同盟不履行: ${ally.name}は${n2.name}への援軍を拒否しました...(関係悪化)`, "log-info");
                // 関係悪化
                breakAlliance(n2, ally);
                n2.relations[ally.id] = -50;
                ally.relations[n2.id] = -50;
            }
        }
    });
}

function concludePeace(n1, n2, type) {
    // Determine winner/loser if applicable
    let winner = n1, loser = n2;
    if (n2.getMilitaryPower() > n1.getMilitaryPower()) {
        winner = n2;
        loser = n1;
    }

    // 徹底抗戦シナリオ: 完全決着(傀儡化)以外はすべて拒否して戦争継続
    if (activeScenario === 'TOTALLER_KRIEG') {
        if (type !== 'PUPPET') {
            return; // 戦争継続
        }
    }

    n1.atWarWith = n1.atWarWith.filter(id => id !== n2.id);
    n2.atWarWith = n2.atWarWith.filter(id => id !== n1.id);

    if (type === 'WHITE_PEACE') {
        log(`白紙講和: ${n1.name}と${n2.name}が現状維持で停戦しました。`, "log-peace");
        n1.addHistory(`白紙講和: ${n2.name}と停戦`);
        n2.addHistory(`白紙講和: ${n1.name}と停戦`);
    } else if (type === 'PARTIAL_PEACE') {
        // Transfer some cities as a condition
        // 勝者の本国に近い都市を優先的に割譲させる
        const numCitiesToTransfer = Math.min(loser.cities.length - 1, 2);
        
        if (numCitiesToTransfer > 0) {
            // 距離計算用ヘルパー
            const getDist = (c1, c2) => {
                const dx = (c1.tileIdx % width) - c2.x;
                const dy = Math.floor(c1.tileIdx / width) - c2.y;
                return dx*dx + dy*dy;
            };

            // 勝者の重心に近い順にソート
            const sortedCities = [...loser.cities].sort((a, b) => {
                return getDist(a, winner.centroid) - getDist(b, winner.centroid);
            });

            const citiesToTake = sortedCities.slice(0, numCitiesToTransfer);

            citiesToTake.forEach(city => {
                // loser.citiesから削除
                loser.cities = loser.cities.filter(c => c !== city);
                
                city.nationId = winner.id;
                winner.cities.push(city);
                
                // 周辺タイルの譲渡
                const cx = city.tileIdx % width;
                const cy = Math.floor(city.tileIdx / width);
                const radius = 5;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = cx + dx;
                        const ny = cy + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const idx = ny * width + nx;
                            if (ownerGrid[idx] === loser.id) {
                                ownerGrid[idx] = winner.id;
                                winner.tiles.push(idx);
                                loser.tiles = loser.tiles.filter(t => t !== idx);
                            }
                        }
                    }
                }
            });
            log(`途中講和: ${loser.name}が領土を割譲し、${winner.name}と和平しました。`, "log-peace");
            winner.addHistory(`講和(勝利): ${loser.name}より領土獲得`);
            loser.addHistory(`講和(敗北): ${winner.name}へ領土割譲`);
        } else {
            log(`和平: ${n1.name}と${n2.name}が停戦合意しました。`, "log-peace");
        }
    } else if (type === 'ANNEX_BORDER') {
        // 国境地帯の割譲 (約20%)
        const targetCount = Math.floor(loser.tiles.length * 0.2);
        
        // 1. 直接接触しているタイルを特定
        let borderTiles = [];
        for(const tIdx of loser.tiles) {
            const cx = tIdx % width;
            const cy = Math.floor(tIdx / width);
            let isBorder = false;
            const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
            for(const [dx, dy] of neighbors) {
                let nx=cx+dx, ny=cy+dy;
                if(nx>=0 && nx<width && ny>=0 && ny<height) {
                    let nIdx = ny*width+nx;
                    if(ownerGrid[nIdx] === winner.id) {
                        isBorder = true;
                        break;
                    }
                }
            }
            if(isBorder) borderTiles.push(tIdx);
        }

        if (borderTiles.length > 0) {
            const queue = [...borderTiles];
            const takenSet = new Set(borderTiles);
            
            let head = 0;
            while(head < queue.length && takenSet.size < targetCount) {
                const curr = queue[head++];
                const cx = curr % width;
                const cy = Math.floor(curr / width);

                const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
                for(const [dx, dy] of neighbors) {
                    let nx=cx+dx, ny=cy+dy;
                    if(nx>=0 && nx<width && ny>=0 && ny<height) {
                        let nIdx = ny*width+nx;
                        if(ownerGrid[nIdx] === loser.id && !takenSet.has(nIdx)) {
                            takenSet.add(nIdx);
                            queue.push(nIdx);
                        }
                    }
                }
            }

            // 領土移譲
            takenSet.forEach(tIdx => {
                ownerGrid[tIdx] = winner.id;
                winner.tiles.push(tIdx);
            });
            loser.tiles = loser.tiles.filter(t => !takenSet.has(t));

            // 都市移譲
            for(let i=loser.cities.length-1; i>=0; i--) {
                const city = loser.cities[i];
                if(ownerGrid[city.tileIdx] === winner.id) {
                    city.nationId = winner.id;
                    winner.cities.push(city);
                    loser.cities.splice(i, 1);
                }
            }
            log(`国境割譲: ${loser.name}は国境地帯を${winner.name}に割譲しました。`, "log-peace");
            winner.addHistory(`講和(勝利): ${loser.name}より国境地帯を獲得`);
            loser.addHistory(`講和(敗北): ${winner.name}へ国境地帯を割譲`);
        } else {
             log(`和平: ${n1.name}と${n2.name}が停戦合意しました。`, "log-peace");
        }

    } else if (type === 'PUPPET') {
        // 傀儡化時に領土の2/3を宗主国が吸収するが、綺麗な国境にするために
        // 敗戦国の首都を中心に約1/3の領土を残し、残りを割譲させる (BFS)
        const totalTiles = loser.tiles.length;
        const targetKeep = Math.ceil(totalTiles / 3);
        
        // 首都または最初のタイルを起点にする
        let startTile = -1;
        if (loser.cities.length > 0) {
            startTile = loser.cities[0].tileIdx;
        } else if (loser.tiles.length > 0) {
            startTile = loser.tiles[0];
        }

        const keepSet = new Set();
        if (startTile !== -1) {
            const queue = [startTile];
            keepSet.add(startTile);

            let head = 0;
            while(head < queue.length && keepSet.size < targetKeep) {
                const curr = queue[head++];
                const cx = curr % width;
                const cy = Math.floor(curr / width);

                const neighbors = [
                    [cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]
                ];

                for(const [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        // 自分の領土かつ未訪問なら追加
                        if (ownerGrid[nIdx] === loser.id && !keepSet.has(nIdx)) {
                            keepSet.add(nIdx);
                            queue.push(nIdx);
                            if (keepSet.size >= targetKeep) break;
                        }
                    }
                }
            }
        }

        // keepSetに含まれない領土をすべて勝者に移譲
        const originalTiles = [...loser.tiles];
        loser.tiles = []; // 一旦クリアして再構築

        originalTiles.forEach(tIdx => {
            if (keepSet.has(tIdx)) {
                loser.tiles.push(tIdx);
            } else {
                ownerGrid[tIdx] = winner.id;
                winner.tiles.push(tIdx);
            }
        });

        // 都市の委譲判定
        for(let i=loser.cities.length-1; i>=0; i--) {
            const city = loser.cities[i];
            if(ownerGrid[city.tileIdx] === winner.id) {
                city.nationId = winner.id;
                winner.cities.push(city);
                loser.cities.splice(i, 1);
            }
        }

        loser.isPuppet = true;
        loser.masterId = winner.id;
        loser.puppetSince = year;
        loser.updateName();
        loser.stability = 50;
        winner.relations[loser.id] = 100;
        loser.relations[winner.id] = 100;
        
        // 敗戦国の傀儡国を戦勝国へ委譲
        nations.forEach(vassal => {
            if (vassal.isPuppet && vassal.masterId === loser.id && !vassal.isDead) {
                vassal.masterId = winner.id;
                // 名前更新は不要かもしれないが、念のため
                vassal.updateName();
                log(`戦勝国による処分: ${vassal.name}の宗主権が${winner.name}に移譲されました。`, "log-war");
            }
        });

        log(`戦後処理: ${loser.name}は${winner.name}の傀儡国となりました。`, "log-war");
        winner.addHistory(`講和(完全勝利): ${loser.name}を傀儡化`);
        loser.addHistory(`講和(完全敗北): ${winner.name}の傀儡となる`);
    } else {
        log(`和平: ${n1.name}と${n2.name}が停戦合意しました。`, "log-peace");
    }
}

function makePeace(n1, n2) {
    concludePeace(n1, n2, 'DEFAULT');
}

function manageTheInternational() {
    if (!isSocialismSprouted) return;

    // 社会主義・共産主義国家を特定
    const socialistNations = nations.filter(n => 
        !n.isDead && 
        (n.sysDetailed === '前衛党独裁' || (n.ecoIdeology && (n.ecoIdeology.includes('計画') || n.ecoIdeology.includes('統制')) && n.sysBroad === '全体主義'))
    );

    if (socialistNations.length < 2) {
        // 1カ国以下ならインターナショナルは維持されない（既存があれば解散チェックはしないが）
        return;
    }

    // インターナショナル同盟の存在チェック
    let international = alliances.find(a => a.id === internationalAllianceId);

    if (!international) {
        // 新規作成
        const leader = socialistNations.sort((a,b) => b.gdp - a.gdp)[0];
        const name = (internationalVersion === 1) ? "インターナショナル" : `第${internationalVersion}インターナショナル`;
        international = new Alliance(allianceIdCounter++, name, leader.id, "#cc0000"); // Red color
        alliances.push(international);
        internationalAllianceId = international.id;
        leader.allianceId = international.id;
        log(`万国の労働者よ、団結せよ！ 社会主義国家による同盟「${name}」が結成されました。`, "log-war");
    }

    // 加入漏れの社会主義国を招待
    socialistNations.forEach(n => {
        if (n.allianceId !== international.id) {
            // 他の同盟に入っている場合は脱退してインターナショナル優先（思想的結束）
            if (n.allianceId !== -1) {
                const oldA = alliances.find(a => a.id === n.allianceId);
                if (oldA) {
                    oldA.members = oldA.members.filter(mId => mId !== n.id);
                    if (oldA.members.length <= 1) alliances = alliances.filter(a => a.id !== oldA.id);
                }
            }
            n.allianceId = international.id;
            if (!international.members.includes(n.id)) international.members.push(n.id);
            // 相互に同盟リストを更新
            international.members.forEach(mId => {
                const m = nations.find(nat => nat.id === mId);
                if (m && m.id !== n.id) {
                    if (!m.allies.includes(n.id)) m.allies.push(n.id);
                    if (!n.allies.includes(m.id)) n.allies.push(m.id);
                }
            });
            log(`${n.name}がインターナショナルに加入しました。`, "log-peace");
        }
    });

    // 死んだ国の除外は Alliance クラスや既存ロジックで概ね処理されるが、
    // インターナショナル自体が崩壊（全滅）した場合のケア
    if (international.members.every(mId => {
        const m = nations.find(nat => nat.id === mId);
        return !m || m.isDead;
    })) {
        internationalAllianceId = -1;
        internationalVersion++;
        alliances = alliances.filter(a => a.id !== international.id);
    }
}

function manageAlliedNations() {
    // インターナショナルが存在し、かつ一定以上の勢力（世界のタイルの20%以上）を持っている場合に結成を検討
    const international = alliances.find(a => a.id === internationalAllianceId);
    if (!international) {
        // インターナショナルがいなければ連合国も解散（目的を失う）
        if (alliedNationsId !== -1) {
            const oldA = alliances.find(a => a.id === alliedNationsId);
            if (oldA) {
                oldA.members.forEach(mId => {
                    const m = nations.find(nat => nat.id === mId);
                    if (m) {
                        m.allianceId = -1;
                        m.allies = [];
                    }
                });
                alliances = alliances.filter(a => a.id !== alliedNationsId);
            }
            alliedNationsId = -1;
        }
        return;
    }

    const totalLandTiles = grid.filter(t => t !== 0).length;
    let internationalTiles = 0;
    international.members.forEach(mId => {
        const m = nations.find(nat => nat.id === mId);
        if (m) internationalTiles += m.tiles.length;
    });

    const internationalRatio = internationalTiles / totalLandTiles;

    // 非社会主義かつ民主主義の国家を特定
    const democraticNations = nations.filter(n => 
        !n.isDead && !n.isSocialist() && n.sysBroad === '民主主義'
    );

    if (internationalRatio > 0.2 && democraticNations.length >= 2) {
        let alliedNations = alliances.find(a => a.id === alliedNationsId);
        if (!alliedNations) {
            const leader = democraticNations.sort((a,b) => b.gdp - a.gdp)[0];
            alliedNations = new Alliance(allianceIdCounter++, "連合国", leader.id, "#0000bb"); // Blue color
            alliances.push(alliedNations);
            alliedNationsId = alliedNations.id;
            log(`自由主義の危機！ インターナショナルの拡大に対抗するため、民主主義諸国による同盟「連合国」が結成されました。`, "log-war");
        }

        // 加入
        democraticNations.forEach(n => {
            if (n.allianceId !== alliedNations.id) {
                // インターナショナルへの対抗を優先し、既存の同盟から脱退
                if (n.allianceId !== -1) {
                    const oldA = alliances.find(a => a.id === n.allianceId);
                    if (oldA) {
                        oldA.members = oldA.members.filter(mId => mId !== n.id);
                        if (oldA.members.length <= 1) alliances = alliances.filter(a => a.id !== oldA.id);
                    }
                }
                n.allianceId = alliedNations.id;
                if (!alliedNations.members.includes(n.id)) alliedNations.members.push(n.id);
                
                // 相互同盟リスト更新
                alliedNations.members.forEach(mId => {
                    const m = nations.find(nat => nat.id === mId);
                    if (m && m.id !== n.id) {
                        if (!m.allies.includes(n.id)) m.allies.push(n.id);
                        if (!n.allies.includes(m.id)) n.allies.push(m.id);
                    }
                });
                log(`${n.name}が連合国に加入しました。`, "log-peace");
            }
        });
    } else if (alliedNationsId !== -1) {
        // インターナショナルの脅威が去った、または民主主義国が減った場合は解散
        const oldA = alliances.find(a => a.id === alliedNationsId);
        if (oldA) {
            oldA.members.forEach(mId => {
                const m = nations.find(nat => nat.id === mId);
                if (m) {
                    m.allianceId = -1;
                    m.allies = [];
                }
            });
            alliances = alliances.filter(a => a.id !== alliedNationsId);
            log(`脅威が去り、連合国は解散しました。`, "log-info");
        }
        alliedNationsId = -1;
    }
}

function battle(attacker, defender) {
    // 攻撃側のパワー vs 防御側のパワー + 地形ボーナス
    const atkPow = attacker.getMilitaryPower() * (0.8 + Math.random()*0.4);
    const defPow = defender.getMilitaryPower() * (0.8 + Math.random()*0.4); // 防御有利なしの消耗戦

    // どちらかが領土を奪う
    // 攻撃側が圧倒的に強い場合
    if (atkPow > defPow * 1.5) {
        // 圧倒的勝利: 3タイル奪う
        stealTerritory(attacker, defender);
        stealTerritory(attacker, defender);
        stealTerritory(attacker, defender);
        defender.soldiers = Math.max(0, Math.floor(defender.soldiers * 0.9));
    } else if (atkPow > defPow * 1.1) {
        stealTerritory(attacker, defender);
        // 敗者は兵を失う
        defender.soldiers = Math.max(0, Math.floor(defender.soldiers * 0.95));
    } else {
        // 攻撃失敗、兵を失う
        attacker.soldiers = Math.max(0, Math.floor(attacker.soldiers * 0.98));
    }
}

function navalLanding(attacker, defender) {
    if (!attacker.isCoastal() || !defender.isCoastal()) return;
    if (attacker.ships < 20) return; // ある程度の海軍力が必要

    const atkNaval = attacker.getNavalPower() * (0.8 + Math.random()*0.4);
    const defNaval = defender.getNavalPower() * (0.8 + Math.random()*0.4);

    if (atkNaval > defNaval) {
        // 上陸成功: 敵の海岸タイルを1つ奪う
        stealCoastalTerritory(attacker, defender);
        attacker.ships = Math.max(0, Math.floor(attacker.ships * 0.95)); // 消耗
    } else {
        // 上陸失敗: 海軍力消耗
        attacker.ships = Math.max(0, Math.floor(attacker.ships * 0.8));
    }
}

function stealCoastalTerritory(winner, loser) {
    // 1. 沿岸都市の奪取を優先
    const coastalCities = loser.cities.filter(city => {
        const cx = city.tileIdx % width;
        const cy = Math.floor(city.tileIdx / width);
        let isCoast = false;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            let nx=cx+dx, ny=cy+dy;
            if(nx>=0 && nx<width && ny>=0 && ny<height && grid[ny*width+nx] === 0) isCoast = true;
        });
        return isCoast;
    });

    if (coastalCities.length > 0 && Math.random() < 0.5) {
        const targetCity = coastalCities[Math.floor(Math.random() * coastalCities.length)];
        const cx = targetCity.tileIdx % width;
        const cy = Math.floor(targetCity.tileIdx / width);
        const radius = 4;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = ny * width + nx;
                    if (ownerGrid[idx] === loser.id) {
                        ownerGrid[idx] = winner.id;
                        winner.tiles.push(idx);
                        loser.tiles = loser.tiles.filter(t => t !== idx);
                    }
                }
            }
        }
        targetCity.nationId = winner.id;
        winner.cities.push(targetCity);
        loser.cities = loser.cities.filter(c => c !== targetCity);
        loser.stability -= 15;
        log(`海軍作戦: ${winner.name}が${loser.name}の沿岸都市「${targetCity.name}」を占拠しました！`, "log-war");
        return;
    }

    // 2. 失敗した場合は通常の沿岸タイルを奪う
    for(let i=0; i<100; i++) {
        let tile = loser.tiles[Math.floor(Math.random() * loser.tiles.length)];
        let cx = tile % width;
        let cy = Math.floor(tile / width);
        
        let isCoast = false;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            let nx=cx+dx, ny=cy+dy;
            if(nx>=0 && nx<width && ny>=0 && ny<height) {
                if(grid[ny*width+nx] === 0) isCoast = true;
            }
        });

        if (isCoast) {
            ownerGrid[tile] = winner.id;
            winner.tiles.push(tile);
            loser.tiles = loser.tiles.filter(t => t !== tile);
            loser.stability -= 5;
            log(`海軍作戦: ${winner.name}が${loser.name}への上陸作戦に成功しました！`, "log-war");
            return;
        }
    }
}

function stealTerritory(winner, loser) {
    // 敗者の領土のうち、勝者と接しているタイルを1つ奪う
    // 計算量削減のため、ランダムサンプリングで境界を探す
    for(let i=0; i<20; i++) {
        let tile = winner.tiles[Math.floor(Math.random() * winner.tiles.length)];
        let cx = tile % width;
        let cy = Math.floor(tile / width);
        
        let targetIdx = -1;
        // 隣接する敗者タイルを探す
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            let nx=cx+dx, ny=cy+dy;
            if(nx>=0 && nx<width && ny>=0 && ny<height) {
                let idx = ny*width+nx;
                if(ownerGrid[idx] === loser.id) targetIdx = idx;
            }
        });

        if (targetIdx !== -1) {
            // 地形による進軍速度の変動
            const terrain = grid[targetIdx];
            let difficulty = 1;
            if (terrain === 2) difficulty = 20; // 山岳: 1/20の確率
            if (terrain === 3) difficulty = 2; // 河川: 1/2の確率
            if (terrain === 4) difficulty = 6; // 大河: 1/6の確率
            
            if (Math.random() > (1 / difficulty)) return; // 失敗（進軍停止）

            // 領土移動処理
            ownerGrid[targetIdx] = winner.id;
            winner.tiles.push(targetIdx);
            loser.tiles = loser.tiles.filter(t => t !== targetIdx);

            loser.stability -= 5;

            // Aggressive Expansion: 他国との関係悪化
            nations.forEach(other => {
                if (other.id !== winner.id && !other.isDead) {
                    if (winner.relations[other.id] !== undefined) {
                        winner.relations[other.id] -= 1; // 小さな蓄積
                    }
                }
            });
            worldTension = Math.min(100, worldTension + 0.1);

            return; // 1ターン1タイルのみ
        }
    }
}

/**
 * UI & Utility
 */
function updateNationPanel() {
    if (selectedNationId === -1) return;
    const n = nations.find(nat => nat.id === selectedNationId);
    if (!n) return;

    document.getElementById('n-name').innerText = n.name + (n.isDead ? " (滅亡)" : "");
    document.getElementById('n-name').style.color = n.color;
    document.getElementById('n-leader').innerText = n.leader;
    
    document.getElementById('n-eco').innerText = n.ecoIdeology || '-';
    document.getElementById('n-sys-broad').innerText = n.sysBroad || '-';
    document.getElementById('n-gov').innerText = n.sysDetailed || n.govType;
    document.getElementById('n-struct').innerText = n.stateStruct || '-';
    document.getElementById('n-sov').innerText = n.sovereign || '-';

    document.getElementById('n-religion').innerText = n.religion;
    document.getElementById('n-culture').innerText = (n.cultureType === 'KANJI' ? '漢字文化圏' : 'アルファベット文化圏');
    document.getElementById('n-tech').innerText = TECH_LEVELS[n.tech];

    let allianceText = "なし";
    if (n.allianceId !== -1) {
        const alliance = alliances.find(a => a.id === n.allianceId);
        if (alliance) allianceText = alliance.name;
    }
    document.getElementById('n-alliance').innerText = allianceText;

    let orgsText = "なし";
    if (n.organizationIds.length > 0) {
        const myOrgs = organizations.filter(o => n.organizationIds.includes(o.id));
        orgsText = myOrgs.map(o => o.name).join(", ");
    }
    document.getElementById('n-orgs').innerText = orgsText;

    document.getElementById('n-stability').innerText = Math.floor(n.stability) + "%";
    document.getElementById('n-governance').innerText = Math.floor(n.governance);
    
    document.getElementById('n-gdp').innerText = formatNum(n.gdp);
    document.getElementById('bar-gdp').style.width = Math.min(100, n.gdp / 1000) + "%";
    
    document.getElementById('n-pop').innerText = formatNum(n.pop);
    document.getElementById('bar-pop').style.width = Math.min(100, n.pop / 50000) + "%";
    
    document.getElementById('n-mil').innerText = formatNum(n.soldiers);
    document.getElementById('bar-mil').style.width = Math.min(100, n.soldiers / 5000) + "%";
    
    document.getElementById('n-ind').innerText = n.industry;
    document.getElementById('n-tanks').innerText = n.tanks;
    document.getElementById('n-ships').innerText = n.ships;
    document.getElementById('n-qual').innerText = n.soldierQuality.toFixed(2);

    // Domestic Politics Display
    let politicsDiv = document.getElementById('us-politics-section');
    
    // If no parties, remove if exists
    if (!n.parties || n.parties.length === 0) {
        if (politicsDiv) politicsDiv.remove();
    } else {
        // If exists, update content. If not, create.
        if (!politicsDiv) {
            politicsDiv = document.createElement('div');
            politicsDiv.id = 'us-politics-section';
            politicsDiv.style.marginTop = '15px';
            politicsDiv.style.borderTop = '1px solid #555';
            politicsDiv.style.paddingTop = '10px';
            
            // Structure (create static elements once)
            politicsDiv.innerHTML = `
                <h3>国内政治状況</h3>
                <div id="pol-pres-info"></div>
                <h4 style="margin:5px 0; color:#ccc; font-size:0.9em;">議席分布 (全${n.parliamentSize}席)</h4>
                <canvas id="parliament-chart" width="280" height="100" style="background:#222; margin-bottom:5px; border-radius:4px;"></canvas>
                <div id="pol-party-list" style="margin-top:10px;"></div>
                <div id="pol-history-section" style="display:none;">
                    <h4 style="margin:10px 0 5px 0; color:#ccc; font-size:0.9em;">支持率推移 (過去100年)</h4>
                    <canvas id="support-trend-chart" width="280" height="100" style="background:#222; border:1px solid #444; border-radius:4px;"></canvas>
                </div>
            `;
            const historyBtn = document.getElementById('btn-history');
            if (historyBtn) {
                document.getElementById('nation-panel').insertBefore(politicsDiv, historyBtn);
            } else {
                 document.getElementById('nation-panel').appendChild(politicsDiv);
            }
        }

        // Show/Hide History Section
        const histSection = document.getElementById('pol-history-section');
        if (histSection) {
            histSection.style.display = (n.supportHistory && n.supportHistory.length > 1) ? 'block' : 'none';
        }

        // Update dynamic content
        // President Info
        const info = document.getElementById('pol-pres-info');
        if (info) {
            if (n.president) {
                 const approvalColor = n.president.approval >= 60 ? '#2ecc71' : (n.president.approval < 40 ? '#e74c3c' : '#f1c40f');
                 const govStatus = n.isDividedGovernment ? '<span style="color:#e74c3c">ねじれ (Divided)</span>' : '<span style="color:#2ecc71">安定多数 (Unified)</span>';
                 
                 info.innerHTML = `
                    <div class="stat-row"><span>大統領:</span> <span style="font-weight:bold;">${n.president.name}</span> (${n.president.party})</div>
                    <div class="stat-row"><span>支持率:</span> <span style="color:${approvalColor}; font-weight:bold;">${n.president.approval.toFixed(1)}%</span></div>
                    <div class="stat-row"><span>任期:</span> <span>${n.president.term}期目</span></div>
                    <div class="stat-row"><span>議会状況:</span> <span>${govStatus}</span></div>
                    <div class="stat-row"><span>次期選挙:</span> <span>${n.electionYear}年 (中間: ${n.midtermYear}年)</span></div>
                 `;
            } else {
                 // Standard Democracy
                 const systemName = n.partySystem === 'TWO_PARTY' ? '二大政党制' : '多党制';
                 info.innerHTML = `
                    <div class="stat-row"><span>指導者:</span> <span style="font-weight:bold;">${n.leader}</span></div>
                    <div class="stat-row"><span>政党制:</span> <span>${systemName}</span></div>
                 `;
            }
        }

        // Party List
        const list = document.getElementById('pol-party-list');
        if (list) {
            let html = '';
            n.parties.forEach(p => {
                html += `<div style="font-size:0.8em; margin-bottom:2px; display:flex; align-items:center;">
                    <span style="display:inline-block; width:10px; height:10px; background:${p.color}; margin-right:5px; border-radius:50%;"></span>
                    <span style="color:${p.color}; font-weight:bold; flex:1;">${p.name}</span>
                    <span style="margin-right:10px;">${p.seats}席</span>
                    <span>${p.support.toFixed(1)}%</span>
                </div>`;
            });
            list.innerHTML = html;
        }
    }

    if (n.parties && n.parties.length > 0) {

        // Draw Parliament Chart
        const pCanvas = document.getElementById('parliament-chart');
        if (pCanvas) {
            const pCtx = pCanvas.getContext('2d');
            let startAngle = Math.PI;
            // Draw half donut
            const total = n.parliamentSize;
            let cx = pCanvas.width / 2;
            let cy = pCanvas.height - 10;
            let r = 80;
            
            n.parties.forEach(p => {
                let slice = (p.seats / total) * Math.PI;
                pCtx.beginPath();
                pCtx.arc(cx, cy, r, startAngle, startAngle + slice);
                pCtx.arc(cx, cy, r - 30, startAngle + slice, startAngle, true);
                pCtx.fillStyle = p.color;
                pCtx.fill();
                startAngle += slice;
            });
        }

        // Draw Support Trend Chart
        const tCanvas = document.getElementById('support-trend-chart');
        if (tCanvas && n.supportHistory.length > 1) {
            const tCtx = tCanvas.getContext('2d');
            const history = n.supportHistory;
            const w = tCanvas.width;
            const h = tCanvas.height;
            const padding = 10;
            const drawW = w - padding*2;
            const drawH = h - padding*2;
            
            // Grid lines
            tCtx.strokeStyle = "#444";
            tCtx.lineWidth = 1;
            tCtx.beginPath();
            tCtx.moveTo(padding, padding);
            tCtx.lineTo(padding, h-padding);
            tCtx.lineTo(w-padding, h-padding);
            tCtx.stroke();
            
            n.parties.forEach(p => {
                tCtx.strokeStyle = p.color;
                tCtx.lineWidth = 2;
                tCtx.beginPath();
                
                history.forEach((entry, idx) => {
                    const partyData = entry.parties.find(pd => pd.name === p.name);
                    if (partyData) {
                        const x = padding + (idx / (history.length - 1)) * drawW;
                        const y = h - padding - (partyData.support / 100) * drawH;
                        if (idx === 0) tCtx.moveTo(x, y);
                        else tCtx.lineTo(x, y);
                    }
                });
                tCtx.stroke();
            });
        }
    }
}

function log(msg, className) {
    const logEl = document.getElementById('log');
    const line = document.createElement('div');
    line.innerText = `[Y${year}] ${msg}`;
    if (className) line.className = className;
    logEl.prepend(line);
    if (logEl.children.length > 50) logEl.lastChild.remove();
}

function formatNum(num) {
    if (num >= 100000000) return (num/100000000).toFixed(1) + "億";
    if (num >= 10000) return (num/10000).toFixed(1) + "万";
    return Math.floor(num);
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y)
        rot += step

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y)
        rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
}

function saveGame() {
    const saveData = {
        version: 1,
        width, height,
        currentScenario, activeScenario,
        grid, elevationGrid, ownerGrid,
        nations, nationIdCounter,
        alliances, allianceIdCounter,
        organizations, orgIdCounter,
        year, worldTension,
        hegemonId, hegemonStatus, highTensionDuration,
        isDemocracyAwakened, isSocialismSprouted,
        internationalAllianceId, internationalVersion,
        alliedNationsId,
        frameCounter, simSpeed
    };
    
    const blob = new Blob([JSON.stringify(saveData)], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terl_save_Y${year}.terl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log("ゲームをセーブしました。", "log-info");
}

function loadGame(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            width = data.width;
            height = data.height;
            currentScenario = data.currentScenario;
            activeScenario = data.activeScenario;
            grid = data.grid;
            elevationGrid = data.elevationGrid;
            ownerGrid = data.ownerGrid;
            nations = data.nations;
            nationIdCounter = data.nationIdCounter;
            alliances = data.alliances || [];
            allianceIdCounter = data.allianceIdCounter || 0;
            organizations = data.organizations || [];
            orgIdCounter = data.orgIdCounter || 0;
            year = data.year;
            worldTension = data.worldTension;
            hegemonId = data.hegemonId;
            hegemonStatus = data.hegemonStatus;
            highTensionDuration = data.highTensionDuration;
            isDemocracyAwakened = data.isDemocracyAwakened || false;
            isSocialismSprouted = data.isSocialismSprouted || false;
            internationalAllianceId = data.internationalAllianceId !== undefined ? data.internationalAllianceId : -1;
            internationalVersion = data.internationalVersion || 1;
            alliedNationsId = data.alliedNationsId !== undefined ? data.alliedNationsId : -1;
            frameCounter = data.frameCounter;
            simSpeed = data.simSpeed;
            
            // Rehydrate
            nations.forEach(n => {
                Object.setPrototypeOf(n, Nation.prototype);
                n.cities.forEach(c => Object.setPrototypeOf(c, City.prototype));
            });
            alliances.forEach(a => {
                Object.setPrototypeOf(a, Alliance.prototype);
                a.updateCentroid();
            });
            organizations.forEach(o => Object.setPrototypeOf(o, InternationalOrganization.prototype));
            nations.forEach(n => n.updateCentroid());
            
            updateContinents();
            
            // Update UI
            document.getElementById('info-year').innerText = year;
            document.getElementById('top-ui-year').innerText = year;
            document.getElementById('info-tension').innerText = worldTension.toFixed(1) + "%";
            document.getElementById('top-ui-tension').innerText = worldTension.toFixed(1) + "%";
            document.getElementById('simSpeed').value = simSpeed;
            
            // Switch to sim mode
            document.getElementById('menu-panel').style.display = 'none';
            document.getElementById('sim-panel').style.display = 'block';
            document.getElementById('nation-panel').style.display = 'none';
            isDrawing = false;
            isTerrainEditMode = false;
            document.getElementById('btn-terrain-edit').innerText = '🛠 地形編集: オフ';
            document.getElementById('btn-terrain-edit').style.background = '#d35400';
            document.getElementById('sim-edit-tools').style.display = 'none';
            
            isPaused = true;
            mapDirty = true;
            
            log("ゲームをロードしました。", "log-info");
        } catch(err) {
            console.error(err);
            alert("ロードに失敗しました。");
        }
    };
    reader.readAsText(file);
}

function populateSelect(id, options) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.innerText = opt;
        el.appendChild(o);
    });
}

function openEditNationModal() {
    if (selectedNationId === -1) return;
    const n = nations.find(nat => nat.id === selectedNationId);
    if (!n) return;

    const modal = document.getElementById('edit-nation-modal');
    document.getElementById('edit-n-basename').value = n.baseName;
    
    populateSelect('edit-n-sys-broad', POLITICAL_SYSTEMS.BROAD);
    document.getElementById('edit-n-sys-broad').value = n.sysBroad;
    
    updateDetailedAndSovereignOptions(n.sysBroad);
    document.getElementById('edit-n-sys-detailed').value = n.sysDetailed || n.govType;
    document.getElementById('edit-n-sov').value = n.sovereign;
    
    populateSelect('edit-n-struct', POLITICAL_SYSTEMS.STRUCTURE);
    document.getElementById('edit-n-struct').value = n.stateStruct;
    
    populateSelect('edit-n-eco', POLITICAL_SYSTEMS.ECONOMIC);
    document.getElementById('edit-n-eco').value = n.ecoIdeology;
    
    updateEditPreview();
    modal.style.display = 'block';
}

function updateDetailedAndSovereignOptions(broad) {
    populateSelect('edit-n-sys-detailed', POLITICAL_SYSTEMS.DETAILED[broad]);
    populateSelect('edit-n-sov', POLITICAL_SYSTEMS.SOVEREIGN[broad]);
}

function updateEditPreview() {
    const baseName = document.getElementById('edit-n-basename').value;
    const sysBroad = document.getElementById('edit-n-sys-broad').value;
    const sysDetailed = document.getElementById('edit-n-sys-detailed').value;
    const stateStruct = document.getElementById('edit-n-struct').value;
    const sovereign = document.getElementById('edit-n-sov').value;
    const ecoIdeology = document.getElementById('edit-n-eco').value;
    
    if (selectedNationId === -1) return;
    const n = nations.find(nat => nat.id === selectedNationId);
    if (!n) return;

    // Create a dummy object to use getNationSuffix
    const dummy = {
        id: n.id,
        isPuppet: n.isPuppet,
        masterId: n.masterId,
        isGrandEmpire: n.isGrandEmpire,
        sysBroad: sysBroad,
        sysDetailed: sysDetailed,
        stateStruct: stateStruct,
        sovereign: sovereign,
        ecoIdeology: ecoIdeology,
        regimeNumber: n.regimeNumber
    };
    
    const nameInfo = getNationSuffix(dummy);
    document.getElementById('edit-n-preview').innerText = nameInfo.prefix + baseName + nameInfo.suffix;
}
