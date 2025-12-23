import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

// --- PROPS ---
interface Level3Props {
  onComplete: () => void;
  onBackToMenu: () => void;
  onBackToLevelSelect: () => void;
}

// --- TİPLER ---
interface GameBody extends Matter.Body {
  gameType?: 'bird' | 'pig' | 'block' | 'ground' | 'wall' | 'particle' | 'leaf' | 'anchor';
  hitCount?: number;
  maxHits?: number;
  damageThreshold?: number;
  isDying?: boolean;
  isFading?: boolean;
  isBroken?: boolean;
  hasCollided?: boolean;
  hasUsedAbility?: boolean; 
  lifeTime?: number;
  lastHitTime?: number;
  isBoss?: boolean;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  type: 'score' | 'special' | 'critical';
}

interface ShockwaveEffect {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

const VictoryScene: React.FC<{
  score: number;
  onNextLevel: () => void;
}> = ({ score, onNextLevel }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 200,
      animation: 'fadeIn 0.5s ease-in'
    }}>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0); }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes glow {
          0% { text-shadow: 0 0 10px #FFD700; }
          50% { text-shadow: 0 0 30px #FFD700, 0 0 10px orange; }
          100% { text-shadow: 0 0 10px #FFD700; }
        }
      `}</style>

      <div style={{
        animation: 'popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '60px',
          color: '#FFD700',
          marginBottom: '20px',
          animation: 'glow 2s infinite',
          letterSpacing: '3px'
        }}>
          BU ZAFER SENİN!
        </h1>

        <p style={{
          color: 'white',
          fontSize: '26px',
          marginBottom: '40px'
        }}>
          SKOR: <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{score}</span>
        </p>

        {/* 🔁 TEK BUTON */}
        <button
          onClick={onNextLevel}
          style={{
            padding: '18px 45px',
            fontSize: '26px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🔄 OYUNU SIFIRLAYABİLİRSİN
        </button>
      </div>
    </div>
  );
};


const Level3: React.FC<Level3Props> = ({ onComplete, onBackToMenu, onBackToLevelSelect }) => {
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    const handleResize = () => setGameKey(p => p + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <GameLevel 
      key={gameKey} 
      onReset={() => setGameKey(p => p + 1)} 
      onComplete={onComplete} 
      onBackToMenu={onBackToMenu} 
      onBackToLevelSelect={onBackToLevelSelect} 
    />
  );
};

// --- OYUN MANTIĞI ---
const GameLevel: React.FC<Level3Props & { onReset: () => void }> = ({ 
  onReset, 
  onComplete, 
  onBackToMenu, 
  onBackToLevelSelect 
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const abilityTriggerRef = useRef<() => void>(() => {});

  // --- SES EFEKTLERİ REFLERİ ---
  const sounds = useRef({
    slingshot: new Audio('/audio/slingshot.mp3'),
    woodSmash: new Audio('/audio/wood-smash.mp3'),
    win: new Audio('/audio/nextlevel.wav'),
    lose: new Audio('/audio/losing.wav'),
    score: new Audio('/audio/score.mp3'),
    explosion: new Audio('/audio/explosion.mp3'),
  });

  // UI State
  const totalPigs = 8;
  const initialBirds = 4;
  const [score, setScore] = useState(0);
  const [birdsLeft, setBirdsLeft] = useState(initialBirds);
  const [pigsLeft, setPigsLeft] = useState(totalPigs); 
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  // Yeni State: Zafer Sahnesini Göster
  const [showVictoryScene, setShowVictoryScene] = useState(false);
  const [shake, setShake] = useState({ x: 0, y: 0 });

  // Refs
  const scoreRef = useRef(0);
  const birdsLeftRef = useRef(initialBirds);
  const pigsLeftRef = useRef(totalPigs);
  const isLevelStable = useRef(false);
  
  const currentBirdRef = useRef<GameBody | null>(null);
  const isBirdOnSlingshot = useRef(false);
  const isDraggingRef = useRef(false);
  const isProcessingNextTurn = useRef(false);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const shockwavesRef = useRef<ShockwaveEffect[]>([]);
  const isChargingRef = useRef(false);
  const mousePosRef = useRef<{ x: number, y: number } | null>(null);

  // --- SES YARDIMCISI ---
  const playSound = (audio: HTMLAudioElement) => {
    audio.currentTime = 0; 
    audio.play().catch(e => console.log("Ses hatası:", e));
  };

  // --- EKRAN TİTREME ---
  const triggerScreenShake = (duration: number = 400, intensity: number = 25) => {
    const startTime = Date.now();
    const shakeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        clearInterval(shakeInterval);
        setShake({ x: 0, y: 0 });
        return;
      }
      const x = (Math.random() - 0.5) * intensity;
      const y = (Math.random() - 0.5) * intensity;
      setShake({ x, y });
    }, 16);
  };

  const addFloatingText = (x: number, y: number, text: string, type: 'score' | 'special' | 'critical' = 'score') => {
    const life = (type === 'special' || type === 'critical') ? 150 : 60;
    floatingTextsRef.current.push({
      id: Math.random(),
      x, y, text,
      life: life,
      maxLife: life,
      type
    });
  };

  useEffect(() => {
    // 1.5 saniye koruma süresi
    isLevelStable.current = false;
    setTimeout(() => {
        isLevelStable.current = true;
    }, 1500);

    if (sceneRef.current) {
        sceneRef.current.innerHTML = "";
    }

    const {
      Engine, Render, Runner, World, Bodies, Mouse,
      MouseConstraint, Composite, Constraint, Events, Vector, Body, Common
    } = Matter;

    const engine = Engine.create({
        positionIterations: 12, 
        velocityIterations: 12
    });
    engineRef.current = engine;
    const world = engine.world;

    // --- SES AYARLARI ---
    sounds.current.score.volume = 0.3; // Skor sesi kısık

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    const render = Render.create({
      element: sceneRef.current as HTMLElement,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: 'transparent',
        pixelRatio: pixelRatio,
        showAngleIndicator: false
      }
    });

    const defaultCategory = 0x0001;
    const birdCategory = 0x0002;
    const particleCategory = 0x0004;
    const ghostCategory = 0x0008;

    const slingshotX = width * 0.2;
    const slingshotY = height - 170;
    const SLINGSHOT_STIFFNESS = 0.04;
    const BIRD_DENSITY = 0.040;

    // --- YARDIMCI: DOMUZ ÖLDÜRME ---
    const killPig = (pig: GameBody) => {
        if (pig.isDying) return;
        pig.isDying = true;
        
        addFloatingText(pig.position.x, pig.position.y, "SOYKIRIMCI ÖLDÜ", "critical");

        if (pig.render.sprite) pig.render.sprite.texture = '/image/pig/diepig.png';
        
        Matter.Body.setStatic(pig, true);
        pig.collisionFilter = { ...pig.collisionFilter, mask: 0 };
        
        pigsLeftRef.current -= 1;
        setPigsLeft(pigsLeftRef.current);
        
        setTimeout(() => {
            if(!pig) return;
            const pos = { ...pig.position };
            pig.render.visible = false;
            Matter.Composite.remove(world, pig);
            
            const points = pig.isBoss ? 1000 : 150; 
            scoreRef.current += points;
            setScore(scoreRef.current);
            addFloatingText(pos.x, pos.y, `+${points}`, "score");
            
            playSound(sounds.current.score);

            if (pigsLeftRef.current <= 0) {
                const bonus = birdsLeftRef.current * 200;
                if (bonus > 0) {
                    setTimeout(() => {
                        scoreRef.current += bonus;
                        setScore(scoreRef.current);
                        addFloatingText(width / 2, height / 2, `Kalan Kuş Bonusu: +${bonus}`, 'special');
                        playSound(sounds.current.score);
                    }, 1000);
                }
                
                // DEĞİŞİKLİK: 2 Saniye sonra "Bu Zafer Senin" ekranı açılır
                setTimeout(() => {
                  setGameState('won'); // Oyun durumunu won yap
                  setShowVictoryScene(true); // Zafer sahnesini tetikle
                  playSound(sounds.current.win);
                }, 2000); 
            }
        }, 800);
    };

    // --- DİĞER EFEKTLER ---
    const createLeafParticle = (x: number, y: number, isTrail: boolean = false) => {
        const size = isTrail ? Common.random(6, 10) : Common.random(8, 14);
        const color = isTrail ? '#556B2F' : '#7FFF00'; 
        const leaf = Bodies.polygon(x, y, 3, size, { 
            collisionFilter: { category: particleCategory, mask: 0 }, 
            frictionAir: isTrail ? 0.3 : 0.05, 
            render: { fillStyle: color } 
        }) as GameBody;
        leaf.gameType = 'leaf';
        leaf.lifeTime = isTrail ? 10 : 35;
        Body.setAngle(leaf, Common.random(0, Math.PI * 2));
        Body.setVelocity(leaf, { x: Common.random(-3, 3), y: Common.random(-3, 3) });
        World.add(world, leaf);
    };

    const createExplosion = (x: number, y: number, color: string = '#e6bd19') => {
      const particles: GameBody[] = [];
      for (let i = 0; i < 12; i++) { 
        const particle = Bodies.circle(x, y, Common.random(3, 8), {
          collisionFilter: { category: particleCategory },
          frictionAir: 0.05,
          render: { fillStyle: color }
        }) as GameBody;
        particle.gameType = 'particle';
        particle.lifeTime = 40;
        Body.setVelocity(particle, { x: Common.random(-8, 8), y: Common.random(-8, 8) });
        particles.push(particle);
      }
      World.add(world, particles);
    };

    // --- OBJE OLUŞTURUCULAR ---
    const createBlock = (x: number, y: number, w: number, h: number, texture: string, isHeavy: boolean = false) => {
      const block: GameBody = Bodies.rectangle(x, y, w, h, {
        collisionFilter: { category: defaultCategory },
        render: {
          sprite: { texture, xScale: (w / 100) * 0.94, yScale: (h / 100) * 0.94 },
          opacity: 1
        },
        density: isHeavy ? 0.08 : 0.015, 
        friction: 1.0,     
        frictionStatic: 20.0, 
        restitution: 0.0,   
        chamfer: { radius: 2 }
      });
      block.gameType = 'block';
      block.hitCount = 0;
      block.maxHits = isHeavy ? 6 : 3; 
      block.damageThreshold = 8.0; 
      block.isBroken = false;
      block.isFading = false;
      return block;
    };

    const createPig = (x: number, y: number, isBoss: boolean = false) => {
      const radius = isBoss ? 35 : 20;
      const pig: GameBody = Bodies.circle(x, y, radius, {
        collisionFilter: { category: defaultCategory },
        render: { sprite: { texture: '/image/pig/pig.png', xScale: (radius*2)/220, yScale: (radius*2)/220 } },
        density: isBoss ? 0.05 : 0.002, 
        friction: 0.8,
        restitution: 0.2
      });
      pig.gameType = 'pig';
      pig.isDying = false;
      pig.isBoss = isBoss;
      pig.maxHits = isBoss ? 5 : 1; 
      pig.hitCount = 0;
      return pig;
    };

    // --- SALINCAK YAPI ---
    const createHangingStructure = (cx: number, cy: number) => {
        const topBar = Bodies.rectangle(cx, cy, 80, 10, { 
            isStatic: true, 
            render: { visible: false }, 
            gameType: 'anchor' 
        } as GameBody);

        const hangerBlock = createBlock(cx, cy + 100, 80, 20, '/image/block/block2.png');
        
        const ropeLeft = Constraint.create({
            bodyA: topBar,
            bodyB: hangerBlock,
            pointA: { x: -30, y: 0 }, 
            pointB: { x: -30, y: 0 }, 
            stiffness: 0.9, 
            damping: 0.1,
            render: { visible: true, strokeStyle: '#5D4037', lineWidth: 3 }
        });

        const ropeRight = Constraint.create({
            bodyA: topBar,
            bodyB: hangerBlock,
            pointA: { x: 30, y: 0 }, 
            pointB: { x: 30, y: 0 }, 
            stiffness: 0.9,
            damping: 0.1,
            render: { visible: true, strokeStyle: '#5D4037', lineWidth: 3 }
        });

        const pigOnHanger = createPig(cx, cy + 70); 
        return [topBar, hangerBlock, ropeLeft, ropeRight, pigOnHanger];
    }

    // --- KUŞ YARATMA ---
    let waitingBirdsBodies: GameBody[] = [];
    const updateWaitingBirdsVisuals = () => {
      waitingBirdsBodies.forEach(b => World.remove(world, b));
      waitingBirdsBodies = [];
      const birdsOnGround = birdsLeftRef.current - 1;
      for (let i = 0; i < birdsOnGround; i++) {
        const bird = Bodies.circle(slingshotX - 40 - (i * 35), slingshotY + 120, 15, {
          isStatic: true, isSensor: true,
          render: { sprite: { texture: '/image/bird/sakhra.png', xScale: 0.13, yScale: 0.13 } }
        }) as GameBody;
        waitingBirdsBodies.push(bird);
        World.add(world, bird);
      }
    };

    let slingshotConstraint: Matter.Constraint | null = null;

    const spawnBird = () => {
      if (birdsLeftRef.current <= 0) return;
      
      if (currentBirdRef.current) {
          World.remove(world, currentBirdRef.current);
          currentBirdRef.current = null;
      }

      updateWaitingBirdsVisuals();

      const birdOptions: Matter.IBodyDefinition = {
        density: BIRD_DENSITY, 
        restitution: 0.4,
        friction: 0.1, 
        frictionAir: 0.005, 
        collisionFilter: { category: birdCategory },
        render: { sprite: { texture: '/image/bird/sakhra.png', xScale: 0.13, yScale: 0.13 } }
      };

      const newBird = Bodies.circle(slingshotX, slingshotY, 15, birdOptions) as GameBody;
      newBird.gameType = 'bird';
      newBird.hasCollided = false;
      newBird.hasUsedAbility = false; 
      
      currentBirdRef.current = newBird;
      World.add(world, newBird);

      slingshotConstraint = Constraint.create({
        pointA: { x: slingshotX, y: slingshotY },
        bodyB: newBird,
        stiffness: SLINGSHOT_STIFFNESS, 
        damping: 0.01, 
        length: 1,
        render: { visible: false }
      });
      World.add(world, slingshotConstraint);
      isBirdOnSlingshot.current = true;
      isDraggingRef.current = false;
      isProcessingNextTurn.current = false;
    };

    // --- YETENEK FONKSİYONU (BOMBA) ---
    const activateSpecialAbility = () => {
        const bird = currentBirdRef.current;
        if (!bird || isBirdOnSlingshot.current || bird.hasUsedAbility) return;
    
        bird.hasUsedAbility = true;
        isChargingRef.current = true; 
        
        const { x, y } = bird.position;
        
        setTimeout(() => {
            if (!engineRef.current) return;
            isChargingRef.current = false;
    
            addFloatingText(x, y - 50, "BOOM!", 'special');
            playSound(sounds.current.explosion);
            triggerScreenShake(400, 25); 
            shockwavesRef.current.push({ x, y, radius: 20, opacity: 1.0 });
    
            const BLAST_RADIUS = 200;
            const BLAST_FORCE = 1.5;
            const KILL_DAMAGE = 100;
    
            const allBodies = Matter.Composite.allBodies(world);
    
            allBodies.forEach(body => {
                if (body === bird || body.isStatic) return;
    
                const dist = Matter.Vector.magnitude(Matter.Vector.sub(body.position, { x, y }));
                const gameBody = body as GameBody;
    
                if (dist < BLAST_RADIUS) {
                    const forceMagnitude = BLAST_FORCE * (1 - dist / BLAST_RADIUS);
                    const forceVector = Matter.Vector.normalise(Matter.Vector.sub(body.position, { x, y }));
                    
                    Matter.Body.applyForce(body, body.position, {
                        x: forceVector.x * forceMagnitude,
                        y: forceVector.y * forceMagnitude
                    });
    
                    if (gameBody.gameType === 'pig') {
                        killPig(gameBody);
                    }
    
                    if (gameBody.gameType === 'block') {
                        const newHitCount = (gameBody.hitCount || 0) + KILL_DAMAGE;
                        gameBody.hitCount = newHitCount;

                        if(gameBody.render) gameBody.render.opacity = 0.5;
                        
                        if(newHitCount >= (gameBody.maxHits || 3)) {
                            gameBody.isBroken = true;
                            gameBody.isFading = true;
                            gameBody.collisionFilter = { category: ghostCategory, mask: 0 };
                            createExplosion(gameBody.position.x, gameBody.position.y, '#e6bd19');
                            playSound(sounds.current.score);
                        }
                    }
                }
            });
            
            if (slingshotConstraint) slingshotConstraint.bodyB = null;
            bird.render.visible = false;
            Matter.World.remove(world, bird);
            currentBirdRef.current = null;
            
            if (pigsLeftRef.current > 0 && !isProcessingNextTurn.current) {
                 isProcessingNextTurn.current = true;
                 setTimeout(spawnBird, 1500);
            }
    
        }, 100); 
    };

    abilityTriggerRef.current = activateSpecialAbility;

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Tab') {
            e.preventDefault(); 
            activateSpecialAbility();
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    // --- LEVEL GEOMETRİSİ ---
    const ground = Bodies.rectangle(width / 2, height - 10, width, 60, {
      isStatic: true, render: { visible: false }, gameType: 'ground', friction: 1
    } as GameBody);

    const leftWall = Bodies.rectangle(-20, height / 2, 40, height * 2, { isStatic: true, render: { visible: false } });
    const rightWall = Bodies.rectangle(width + 20, height / 2, 40, height * 2, { isStatic: true, render: { visible: false } });
    const ceiling = Bodies.rectangle(width / 2, -500, width, 50, { isStatic: true, render: { visible: false } });

    const slingshotImage = Bodies.rectangle(slingshotX, slingshotY + 40, 40, 100, {
      isStatic: true, isSensor: true,
      render: { sprite: { texture: '/image/objects/sapan.png', xScale: 0.4, yScale: 0.4 } }
    });

    const structure = Composite.create();
    const groundY = height - 40; 
    const T = 15; 
    
    // --- ÖN YAPI ---
    const frontX = width * 0.55;
    const fb1 = createBlock(frontX - 45, groundY - 40, T, 80, '/image/block/block2.png');
    const fb2 = createBlock(frontX + 45, groundY - 40, T, 80, '/image/block/block2.png');
    const fbTop = createBlock(frontX, groundY - 80 - (T/2), 120, T, '/image/block/block2.png');
    
    const pigFront1 = createPig(frontX, groundY - 20); 
    const pigFront2 = createPig(frontX, groundY - 80 - T - 20); 

    // --- 2. ARKA YAPI ---
    const backX = width * 0.82;
    const TOWER_SPACING = 100; 
    const INNER_WIDTH = 70; 
    const halfInner = INNER_WIDTH / 2;

    const colHeight = 120;
    const level1Y = groundY - (colHeight / 2);

    const leftTowerX = backX - TOWER_SPACING;
    const bbL1_Left = createBlock(leftTowerX - halfInner - (T/2), level1Y, T, colHeight, '/image/block/block2.png');
    const bbL1_Right = createBlock(leftTowerX + halfInner + (T/2), level1Y, T, colHeight, '/image/block/block2.png');

    const rightTowerX = backX + TOWER_SPACING;
    const bbR1_Left = createBlock(rightTowerX - halfInner - (T/2), level1Y, T, colHeight, '/image/block/block2.png');
    const bbR1_Right = createBlock(rightTowerX + halfInner + (T/2), level1Y, T, colHeight, '/image/block/block2.png');

    const platformWidth = (TOWER_SPACING * 2) + INNER_WIDTH + 60;
    const platformY = groundY - colHeight - (T/2);
    const bbMidPlat = createBlock(backX, platformY, platformWidth, T, '/image/block/block2.png');

    const topColHeight = 80;
    const topLevelY = platformY - (T/2) - (topColHeight/2);
    const topSpacing = TOWER_SPACING - 30;
    const bbTop1 = createBlock(backX - topSpacing, topLevelY, T, topColHeight, '/image/block/block2.png');
    const bbTop2 = createBlock(backX + topSpacing, topLevelY, T, topColHeight, '/image/block/block2.png');
    
    const roofY = topLevelY - (topColHeight/2) - (T/2);
    const bbRoof = createBlock(backX, roofY, (topSpacing * 2) + 80, T, '/image/block/block2.png');

    const pigBack1 = createPig(leftTowerX, groundY - 20); 
    const pigBack2 = createPig(rightTowerX, groundY - 20); 
    
    const pigBoss = createPig(backX, platformY - (T/2) - 35, true); 
    const pigTop = createPig(backX, roofY - (T/2) - 20); 

    const hanger1 = createHangingStructure(frontX - 120, height * 0.25);
    const hanger2 = createHangingStructure(backX + 140, height * 0.2); 

    Composite.add(structure, [
        fb1, fb2, fbTop, pigFront1, pigFront2,
        bbL1_Left, bbL1_Right, bbR1_Left, bbR1_Right,
        bbMidPlat, bbTop1, bbTop2, bbRoof,
        pigBack1, pigBack2, pigBoss, pigTop,
        ...hanger1, ...hanger2
    ]);

    World.add(world, [ground, leftWall, rightWall, ceiling, slingshotImage, structure]);

    const mouse = Mouse.create(render.canvas);
    mouse.pixelRatio = pixelRatio;
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
      collisionFilter: { mask: birdCategory }
    });
    World.add(world, mouseConstraint);

    // --- MOUSE OLAYLARI ---
    Events.on(mouseConstraint, 'mousedown', (e: any) => {
        if (isBirdOnSlingshot.current) isDraggingRef.current = true;
        if (e.source.body === currentBirdRef.current && isBirdOnSlingshot.current) {
            playSound(sounds.current.slingshot);
        }
    });

    Events.on(mouseConstraint, 'mousemove', (e) => {
        mousePosRef.current = e.mouse.position;
    });

    Events.on(mouseConstraint, 'mouseup', () => {
        isDraggingRef.current = false;
        mousePosRef.current = null;
    });

    Events.on(mouseConstraint, 'enddrag', (e: any) => {
      isDraggingRef.current = false;
      mousePosRef.current = null; 
      
      if (e.body === currentBirdRef.current && isBirdOnSlingshot.current) {
        isBirdOnSlingshot.current = false;
        setTimeout(() => {
          if (slingshotConstraint) slingshotConstraint.bodyB = null;
          birdsLeftRef.current -= 1;
          setBirdsLeft(birdsLeftRef.current);
        }, 20);
      }
    });

    setTimeout(() => spawnBird(), 100);

    // --- ÇARPIŞMA MANTIĞI ---
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA as GameBody;
        const bodyB = pair.bodyB as GameBody;
        if (!bodyA || !bodyB) return;

        const handleBirdCollision = (body: GameBody) => {
          if (body.gameType === 'bird' && !body.hasCollided && !isBirdOnSlingshot.current) {
            body.hasCollided = true; 
            body.frictionAir = 0.05; 
            if (body.render && body.render.sprite) {
                body.render.sprite.xScale = 0.13;
                body.render.sprite.yScale = 0.13;
            }
            
            setTimeout(() => {
              if(body.render) body.render.visible = false; 
              setTimeout(() => World.remove(world, body), 0);
              if (currentBirdRef.current === body) currentBirdRef.current = null;

              if (pigsLeftRef.current > 0 && birdsLeftRef.current > 0) {
                if (!isProcessingNextTurn.current) {
                  isProcessingNextTurn.current = true;
                  setTimeout(spawnBird, 500);
                }
              } else if (pigsLeftRef.current > 0 && birdsLeftRef.current <= 0) {
                setGameState('lost');
                playSound(sounds.current.lose);
              }
            }, 2500);
          }
        };
        if (bodyA.gameType === 'bird') handleBirdCollision(bodyA);
        if (bodyB.gameType === 'bird') handleBirdCollision(bodyB);

        // FİZİKSEL HASAR
        const speedVector = Vector.sub(bodyA.velocity, bodyB.velocity);
        const impactForce = Vector.magnitude(speedVector);
        
        if (impactForce < 3.0 || !isLevelStable.current) return; 

        const applyDamage = (victim: GameBody, attacker: GameBody) => {
          if (victim.isDying || victim.isBroken || victim.isFading) return;

          if (victim.gameType === 'pig') {
              let damageMultiplier = 1;
              if (attacker.gameType === 'block') {
                  damageMultiplier = attacker.density > 0.05 ? 3.0 : 2.0;
              }
              const effectiveForce = impactForce * damageMultiplier;

              if (victim.isBoss) {
                  const damage = effectiveForce > 4.0 ? 1 : 0; 
                  const currentHits = (victim.hitCount || 0) + damage;
                  if (damage > 0) {
                      victim.hitCount = currentHits;
                      if (victim.render) victim.render.opacity = 1 - (currentHits / (victim.maxHits || 5)) * 0.5;
                  }
                  if (currentHits >= (victim.maxHits || 5)) {
                        killPig(victim);
                  }
              } else {
                  if (attacker.gameType === 'block' && effectiveForce > 4.0) {
                        killPig(victim);
                  } 
                  else if (effectiveForce > 3.0) {
                      killPig(victim);
                  }
              }
          }
          else if (victim.gameType === 'block') {
            if (impactForce > (victim.damageThreshold || 8)) {
              playSound(sounds.current.woodSmash);
              
              const currentHits = (victim.hitCount || 0) + 1;
              victim.hitCount = currentHits;

              if (currentHits >= 1 && currentHits < (victim.maxHits || 3)) {
                if (victim.render) victim.render.opacity = 0.7;
              }
              if (victim.maxHits && currentHits >= victim.maxHits) {
                victim.isBroken = true; 
                victim.isFading = true;
                victim.collisionFilter = { category: ghostCategory, mask: 0 };
                if (victim.position) {
                  createExplosion(victim.position.x, victim.position.y, '#e6bd19');
                  addFloatingText(victim.position.x, victim.position.y, "+50", 'score');
                }
                scoreRef.current += 50;
                setScore(scoreRef.current);
                playSound(sounds.current.score);
              }
            }
          }
        };

        if (bodyA.gameType === 'pig' || bodyA.gameType === 'block') applyDamage(bodyA, bodyB);
        if (bodyB.gameType === 'pig' || bodyB.gameType === 'block') applyDamage(bodyB, bodyA);
      });
    });

    // --- RENDER DÖNGÜSÜ ---
    Events.on(render, 'afterRender', () => {
      const ctx = render.context;
      const bird = currentBirdRef.current;

      if (isBirdOnSlingshot.current && isDraggingRef.current && mousePosRef.current && slingshotConstraint && bird) {
          const slingPos = slingshotConstraint.pointA;
          const mousePos = mousePosRef.current;
          
          const pullVector = Vector.sub(slingPos, mousePos);
          const velocityScale = SLINGSHOT_STIFFNESS * 10; 
          let predictedVelocity = Vector.mult(pullVector, velocityScale);

          let projectedPos = { ...bird.position };
          const gravity = engine.gravity;
          
          ctx.beginPath();
          // DEĞİŞİKLİK 2: Düz ve saydam çizgi
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 3;
          
          for (let i = 0; i < 25; i++) { 
              projectedPos = Vector.add(projectedPos, predictedVelocity);
              predictedVelocity.x += gravity.x * gravity.scale * 1.5; 
              predictedVelocity.y += gravity.y * gravity.scale * 1.5;

              if (projectedPos.y > height - 20) break;
              
              if (i === 0) ctx.moveTo(projectedPos.x, projectedPos.y);
              else ctx.lineTo(projectedPos.x, projectedPos.y);
          }
          ctx.stroke();
      }

      if (bird && isBirdOnSlingshot.current) {
        ctx.beginPath();
        ctx.moveTo(slingshotX - 15, slingshotY);
        ctx.lineTo(bird.position.x, bird.position.y);
        ctx.lineTo(slingshotX + 15, slingshotY);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#301808';
        ctx.stroke();
      }

      if (bird && isChargingRef.current) {
          ctx.beginPath();
          ctx.arc(bird.position.x, bird.position.y, 25, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; 
          ctx.fill();
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.stroke();
      }

      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
          const wave = shockwavesRef.current[i];
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(200, 230, 255, ${wave.opacity})`;
          ctx.lineWidth = 15 * wave.opacity;
          ctx.stroke();
          wave.radius += 10; 
          wave.opacity -= 0.05; 

          if (wave.opacity <= 0) {
              shockwavesRef.current.splice(i, 1);
          }
      }

      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ctx.save();
        ctx.translate(ft.x, ft.y);

        if (ft.type === 'critical') {
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "900 28px Arial";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 15;
            ctx.fillText(ft.text, -100, 0);
        } else if (ft.type === 'special') {
            ctx.fillStyle = "#FF4500";
            ctx.font = "900 30px Arial";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 10;
            ctx.fillText(ft.text, -50, 0);
        } else {
            const alpha = ft.life / 60;
            ctx.globalAlpha = alpha;
            ctx.font = "bold 26px Arial";
            ctx.fillStyle = "#FFD700";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.fillText(ft.text, 0, 0);
            ctx.strokeText(ft.text, 0, 0);
            ft.y -= 1.5;
        }

        ctx.restore();
        ft.life--;
        if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
      }

      try {
        const bodies = Composite.allBodies(world) as GameBody[];
        bodies.forEach((body) => {
          if (body.isFading && body.render && typeof body.render.opacity === 'number') {
            body.render.opacity -= 0.05; 
            if (body.render.opacity <= 0) {
               World.remove(world, body);
            }
          }
          if (body.gameType === 'particle' || body.gameType === 'leaf') {
            if (body.lifeTime && body.lifeTime > 0) {
              body.lifeTime--;
              if (body.render) {
                  const maxLife = body.gameType === 'leaf' ? (body.isSensor ? 10 : 35) : 30;
                  body.render.opacity = body.lifeTime / maxLife;
              }
            } else {
              World.remove(world, body);
            }
          }
        });
      } catch (e) { }
    });

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (render) {
          Render.stop(render);
          if (render.canvas) render.canvas.remove();
      }
      if (runner) Runner.stop(runner);
      if (engine) {
          World.clear(engine.world, true);
          Engine.clear(engine);
      }
    };
  }, [onReset]);

  return (
    <div 
      onClick={() => abilityTriggerRef.current()} 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        overflow: 'hidden',
        backgroundImage: "url('/image/backgraound/bg_palestine.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        touchAction: 'none',
        transform: `translate(${shake.x}px, ${shake.y}px)`
      }}
    >
      <div style={{
        position: 'absolute', top: 15, width: '100%', textAlign: 'center',
        fontSize: '24px', fontWeight: 'bold', color: 'white', textShadow: '2px 2px 4px #000',
        zIndex: 20, pointerEvents: 'none', userSelect: 'none'
      }}>Angry Birds: Filistin - Level 3 (Sakhra'nın Öfkesi)</div>

      <div style={{
        position: 'absolute', top: 20, left: 20, display: 'flex', flexDirection: 'column', gap: '8px',
        fontFamily: 'Arial', fontWeight: 'bold', color: 'white', zIndex: 20, textShadow: '2px 2px 3px black', pointerEvents: 'none', userSelect: 'none'
      }}>
        <div style={{ fontSize: '28px', color: '#FFD700' }}>SKOR: {score}</div>
        <div style={{ fontSize: '20px' }}>KUŞLAR: {birdsLeft}</div>
        <div style={{ fontSize: '14px', color: '#e88' }}>(SPACE: Şok Dalgası)</div>
      </div>

      <div style={{
        position: 'absolute', top: 20, right: 30, display: 'flex', alignItems: 'center', gap: '10px',
        fontFamily: 'Arial', fontWeight: 'bold', color: 'white', zIndex: 20, textShadow: '2px 2px 3px black', pointerEvents: 'none', userSelect: 'none'
      }}>
        <img src="/image/pig/pig.png" alt="Pig" style={{ width: '35px', height: '35px' }} />
        <span style={{ fontSize: '28px' }}>x {pigsLeft}</span>
      </div>

      <div ref={sceneRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, touchAction: 'none' }} />

      {/* --- YENİ EKLENEN: Zafer Sahnesi Gösterimi --- */}
      {showVictoryScene && (
        <VictoryScene 
          score={score} 
          onNextLevel={onComplete} 
        />
      )}

      {/* Kaybetme Ekranı (Eski usul devam ediyor, sadece 'lost' durumunda çalışır) */}
      {gameState === 'lost' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '50px', borderRadius: '25px', textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', minWidth: '350px', border: '5px solid #3E2723'
          }} onClick={(e) => e.stopPropagation()}>
            <h1 style={{ color: '#f44336', fontSize: '42px', margin: '0 0 10px 0' }}>
              KAYBETTİNİZ!
            </h1>
            <p style={{ fontSize: '24px', marginBottom: '30px', fontWeight: 'bold', color: '#555' }}>Toplam Skor: {score}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={onReset} style={buttonStyle('#2196F3')}>🔄 TEKRAR ET</button>
              <button onClick={onBackToLevelSelect} style={buttonStyle('#9E9E9E')}>📋 SEVİYE SEÇ</button>
              <button onClick={onBackToMenu} style={buttonStyle('#757575')}>🏠 ANA MENÜ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const buttonStyle = (bgColor: string) => ({
  padding: '15px 30px', fontSize: '20px', cursor: 'pointer', backgroundColor: bgColor,
  color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold',
  transition: 'transform 0.1s', boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
} as React.CSSProperties);

export default Level3;