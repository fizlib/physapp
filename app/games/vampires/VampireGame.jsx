"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, Crosshair, Eye, UsersRound } from 'lucide-react';

const ROLE_LABELS = {
  Investigator: 'Šerifas',
  Lookout: 'Stebėtojas',
  Doctor: 'Gydytojas',
  Jailor: 'Kalėjimo prižiūrėtojas',
  Citizen: 'Miestietis',
  Vampire: 'Vampyras',
  'Vampire Framer': 'Vampyras klastotojas',
  Jester: 'Juokdarys',
};

const ALIGNMENT_LABELS = {
  Good: 'Gerieji',
  Evil: 'Blogieji',
  Neutral: 'Neutralūs',
  good: 'gerieji',
  evil: 'blogieji',
  neutral: 'neutralūs',
  GOOD: 'Gerieji',
  EVIL: 'Blogieji',
  NEUTRAL: 'Neutralūs',
};

const PHASE_LABELS = {
  LOBBY: 'Laukimo kambarys',
  NIGHT: 'Naktis',
  DAY_DISCUSS: 'Dienos diskusija',
  DAY_VOTE: 'Dienos balsavimas',
  GAME_OVER: 'Žaidimas baigtas',
};

const getRoleLabel = role => role ? ROLE_LABELS[role] || role : 'Vaidmuo nepriskirtas';
const getAlignmentLabel = alignment => alignment ? ALIGNMENT_LABELS[alignment] || alignment : 'Nežinoma';
const getPhaseLabel = phase => phase ? PHASE_LABELS[phase] || phase.replaceAll('_', ' ').toLocaleLowerCase('lt-LT') : '';
const getGenderLabel = gender => ({ male: 'vyras', female: 'moteris', neutral: 'neutralus' }[gender] || gender);
const pluralizeLt = (count, one, few, many) => {
  const lastTwo = Math.abs(count) % 100;
  const last = Math.abs(count) % 10;
  if (last === 1 && lastTwo !== 11) return one;
  if (last >= 2 && last <= 9 && (lastTwo < 10 || lastTwo >= 20)) return few;
  return many;
};

const translateServerMessage = message => ({
  'Game no longer exists.': 'Žaidimo nebėra.',
  'Game is full.': 'Žaidime nebėra vietų.',
  'Invalid game code.': 'Neteisingas žaidimo kodas.',
  'Player not found.': 'Žaidėjas nerastas.',
  'Only the host can do that.': 'Tai gali atlikti tik vedėjas.',
  'The game has already started.': 'Žaidimas jau prasidėjo.',
}[message] || message);

const translateGameLogMessage = message => {
  if (typeof message !== 'string') return message;

  let source = message.trim().replace(/^>\s*/, '');
  let phasePrefix = '';
  const phaseMatch = source.match(/^\[(Day|Night)\s+(\d+)\]\s*(.*)$/i);
  if (phaseMatch) {
    phasePrefix = `[${phaseMatch[2]} ${phaseMatch[1].toLowerCase() === 'day' ? 'diena' : 'naktis'}]`;
    source = phaseMatch[3].trim();
  }

  const withPhase = translated => phasePrefix ? `${phasePrefix} ${translated}` : translated;
  const role = rawRole => getRoleLabel(String(rawRole).trim().replace(/[.!]+$/, ''));
  const removedWithRole = (playerName, roleName, context = '') => withPhase(
    `${context ? `${context}: ` : ''}${playerName} nebedalyvauja žaidime. Vaidmuo – ${role(roleName)}.`
  );

  let match = source.match(/^Night (\d+) started[.!]?$/i);
  if (match) return `Prasidėjo ${match[1]} naktis`;
  match = source.match(/^Day (\d+) started[.!]?$/i);
  if (match) return `Prasidėjo ${match[1]} diena`;

  match = source.match(/^(.+?) was lynched!?\s*They were an? (.+?)[.!]*$/i);
  if (match) return removedWithRole(match[1], match[2], 'Balsavimo rezultatas');
  match = source.match(/^(.+?) was lynched[.!]?$/i);
  if (match) return withPhase(`Balsavimo rezultatas: ${match[1]} nebedalyvauja žaidime.`);

  match = source.match(/^(.+?) was executed by the Jailor!?\s*They were an? (.+?)[.!]*$/i);
  if (match) return removedWithRole(match[1], match[2], 'Kalėjimo prižiūrėtojo sprendimas');
  match = source.match(/^(.+?) was executed by the Jailor[.!]?$/i);
  if (match) return withPhase(`Kalėjimo prižiūrėtojo sprendimas: ${match[1]} nebedalyvauja žaidime.`);

  match = source.match(/^(.+?) (?:was killed(?: by (?:the )?.+?)?|was found dead(?: last night)?|died(?: last night| in jail)?|has died|was eliminated)[.!]?\s*They were an? (.+?)[.!]*$/i);
  if (match) return removedWithRole(match[1], match[2]);
  match = source.match(/^(.+?) (?:was killed(?: by (?:the )?.+?)?|was found dead(?: last night)?|died(?: last night| in jail)?|has died|was eliminated)[.!]?$/i);
  if (match) return withPhase(`${match[1]} nebedalyvauja žaidime.`);

  match = source.match(/^(.+?) was removed from the game[.!]?$/i);
  if (match) return withPhase(`${match[1]} nebedalyvauja žaidime.`);
  match = source.match(/^(.+?) was returned to the game[.!]?$/i);
  if (match) return withPhase(`${match[1]} vėl dalyvauja žaidime.`);
  match = source.match(/^(.+?) was revived[.!]?$/i);
  if (match) return withPhase(`${match[1]} vėl dalyvauja žaidime.`);

  match = source.match(/^(.+?) (?:was converted|has been converted) (?:into|to) an? Vampire[.!]?$/i);
  if (match) return withPhase(`${match[1]} tapo vampyru.`);
  match = source.match(/^(.+?) was bitten by the Vampires?[.!]?$/i);
  if (match) return withPhase(`Vampyrai pasirinko paversti ${match[1]} vampyru.`);

  match = source.match(/^(.+?) was framed[.!]?$/i);
  if (match) return withPhase(`Suklastoti duomenys apie ${match[1]}.`);
  match = source.match(/^(.+?) was jailed[.!]?$/i);
  if (match) return withPhase(`Privati apklausa: ${match[1]}.`);
  match = source.match(/^(.+?) was healed(?: by the Doctor)?[.!]?$/i);
  if (match) return withPhase(`Gydytojas apsaugojo ${match[1]}.`);

  match = source.match(/^(.+?) voted (?:for|against) (.+?)[.!]?$/i);
  if (match) return withPhase(`${match[1]} balsavo už ${match[2]}.`);
  match = source.match(/^(.+?) (?:cancelled|canceled|withdrew) (?:their )?vote[.!]?$/i);
  if (match) return withPhase(`${match[1]} atšaukė savo balsą.`);

  match = source.match(/^(.+?) joined the game[.!]?$/i);
  if (match) return withPhase(`${match[1]} prisijungė prie žaidimo.`);
  match = source.match(/^(.+?) (?:left the game|disconnected)[.!]?$/i);
  if (match) return withPhase(`${match[1]} pasitraukė iš žaidimo.`);

  match = source.match(/^(.+?) is suspicious[.!]?$/i);
  if (match) return withPhase(`${match[1]} kelia įtarimų.`);
  match = source.match(/^(.+?) is not suspicious[.!]?$/i);
  if (match) return withPhase(`${match[1]} nekelia įtarimų.`);
  match = source.match(/^Nobody visited (.+?)[.!]?$/i);
  if (match) return withPhase(`Pas ${match[1]} niekas neapsilankė.`);
  match = source.match(/^(.+?) was visited by (.+?)[.!]?$/i);
  if (match) return withPhase(`Apsilankymai pas ${match[1]}: ${match[2]}.`);

  match = source.match(/^They were an? (.+?)[.!]*$/i);
  if (match) return withPhase(`Vaidmuo – ${role(match[1])}.`);

  const exactTranslations = {
    'Voting started': 'Prasidėjo balsavimas',
    'Voting ended': 'Balsavimas baigtas',
    'No one was lynched.': 'Balsavimu niekas nepašalintas iš žaidimo.',
    'No one was lynched!': 'Balsavimu niekas nepašalintas iš žaidimo.',
    'No one died.': 'Niekas nepašalintas iš žaidimo.',
    'No one died last night.': 'Praėjusią naktį niekas nepašalintas iš žaidimo.',
    'Cancelled framing': 'Klastojimas atšauktas',
    'Cancelled action': 'Veiksmas atšauktas',
    'The Town has won!': 'Laimėjo miestiečiai!',
    'The Good team has won!': 'Laimėjo gerųjų komanda!',
    'The Vampires have won!': 'Laimėjo vampyrai!',
    'The Evil team has won!': 'Laimėjo blogųjų komanda!',
    'The Jester has won!': 'Laimėjo juokdarys!',
    'Game over': 'Žaidimas baigtas',
    'Game over!': 'Žaidimas baigtas!',
  };
  if (exactTranslations[source]) return withPhase(exactTranslations[source]);

  const partiallyTranslated = source
    .replace(/\bVampire Framer\b/g, getRoleLabel('Vampire Framer'))
    .replace(/\bInvestigator\b/g, getRoleLabel('Investigator'))
    .replace(/\bLookout\b/g, getRoleLabel('Lookout'))
    .replace(/\bDoctor\b/g, getRoleLabel('Doctor'))
    .replace(/\bJailor\b/g, getRoleLabel('Jailor'))
    .replace(/\bCitizen\b/g, getRoleLabel('Citizen'))
    .replace(/\bVampire\b/g, getRoleLabel('Vampire'))
    .replace(/\bJester\b/g, getRoleLabel('Jester'))
    .replace(/\bwas lynched\b/gi, 'pašalintas balsavimu')
    .replace(/\bwas executed(?: by the Kalėjimo prižiūrėtojas)?\b/gi, 'pašalintas iš žaidimo')
    .replace(/\bwas killed(?: by .+)?\b/gi, 'pašalintas iš žaidimo')
    .replace(/\bwas found dead\b/gi, 'pašalintas iš žaidimo')
    .replace(/\bdied\b/gi, 'pašalintas iš žaidimo')
    .replace(/\bThey were an?\b/gi, 'Vaidmuo –')
    .replace(/\bVoting started\b/gi, 'Prasidėjo balsavimas')
    .replace(/\bVoting ended\b/gi, 'Balsavimas baigtas');

  return withPhase(partiallyTranslated);
};

// Random username generator
const generateRandomUsername = () => {
  const adjectives = ['Šešėlinis', 'Tamsusis', 'Kruvinasis', 'Naktinis', 'Raudonasis', 'Tylusis', 'Mistinis', 'Senovinis', 'Blyškusis', 'Amžinasis'];
  const nouns = ['Medžiotojas', 'Klajūnas', 'Seklys', 'Naikintojas', 'Ieškotojas', 'Stebėtojas', 'Fantomas', 'Šmėkla', 'Varnas', 'Vilkas'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
};

const ROLE_INFO = {
  Investigator: {
    alignment: 'Good',
    art: 'investigator',
    ability: 'Kiekvieną naktį patikrinkite vieną žaidėją ir sužinokite, ar jis kelia įtarimų.',
    goal: 'Pašalinkite visus vampyrus ir likite žaidime.'
  },
  Lookout: {
    alignment: 'Good',
    art: 'lookout',
    ability: 'Kiekvieną naktį stebėkite vieną žaidėją ir sužinokite, kas jį aplanko.',
    goal: 'Pašalinkite visus vampyrus ir likite žaidime.'
  },
  Doctor: {
    alignment: 'Good',
    art: 'doctor',
    ability: 'Kiekvieną naktį išgydykite vieną žaidėją ir apsaugokite jį nuo vampyrų atakos. Per žaidimą turite 3 gydymus.',
    goal: 'Pašalinkite visus vampyrus ir likite žaidime.'
  },
  Jailor: {
    alignment: 'Good',
    art: 'jailor',
    ability: 'Kiekvieną naktį įkalinkite vieną žaidėją privačiai apklausai. Nuspręskite, ar pašalinti kalinį iš žaidimo.',
    goal: 'Pašalinkite visus vampyrus ir likite žaidime. Įspėjimas: pašalinę nekaltą žaidėją, būsite pašalinti ir jūs!'
  },
  Citizen: {
    alignment: 'Good',
    art: 'citizen',
    ability: 'Ypatingų gebėjimų neturite. Dieną balsuokite išmintingai.',
    goal: 'Pašalinkite visus vampyrus ir likite žaidime.'
  },
  Vampire: {
    alignment: 'Evil',
    art: 'vampire',
    ability: 'Kas antrą naktį balsuokite, kurį miestietį paversti vampyru. Daugiausia balsų gavęs taikinys bus paverstas, o lygiųjų atveju taikinys parenkamas atsitiktinai.',
    goal: 'Paverskite arba pašalinkite visus, kurie nėra vampyrai.'
  },
  'Vampire Framer': {
    alignment: 'Evil',
    art: 'vampire-framer',
    ability: 'Kiekvieną naktį suklastokite vieno žaidėjo duomenis, kad šerifui jis atrodytų kaip vampyras. Kas antrą naktį taip pat balsuokite, ką paversti.',
    goal: 'Paverskite arba pašalinkite visus, kurie nėra vampyrai.'
  },
  Jester: {
    alignment: 'Neutral',
    art: 'jester',
    ability: 'Ypatingo naktinio gebėjimo neturite. Stenkitės elgtis įtartinai!',
    goal: 'Kad laimėtumėte, dieną turite būti pašalinti balsavimu.'
  }
};

const createGameLogEntry = (log, fallbackType = 'public') => {
  const logData = typeof log === 'object' && log !== null
    ? log
    : { message: log };

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    message: String(logData.message ?? '').replace(/^>\s*/, ''),
    time: new Date().toLocaleTimeString('lt-LT', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    type: logData.type || fallbackType,
  };
};

const getPhaseLogEntry = (state, round) => {
  if (state === 'NIGHT') return { message: `Prasidėjo ${round} naktis`, type: 'night' };
  if (state === 'DAY_DISCUSS') return { message: `Prasidėjo ${round} diena`, type: 'day' };
  if (state === 'DAY_VOTE') return { message: 'Prasidėjo balsavimas', type: 'day' };
  return null;
};

const getRoleAutoShownKey = gameCode => `vampire_role_auto_shown_${gameCode}`;

// Pre-generate snowflake data outside component to prevent regeneration
const SNOWFLAKE_DATA = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  animationDuration: `${5 + Math.random() * 10}s`,
  animationDelay: `${Math.random() * 5}s`,
  fontSize: `${0.5 + Math.random() * 1}rem`,
}));

// Snowfall component defined outside App to prevent re-creation
const Snowfall = React.memo(function Snowfall() {
  return (
    <div className="snowfall">
      {SNOWFLAKE_DATA.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: flake.left,
            animationDuration: flake.animationDuration,
            animationDelay: flake.animationDelay,
            fontSize: flake.fontSize,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
});

export default function VampireGame({
  socket,
  gameCode,
  playerId,
  displayName,
  initialTheme = 'dark',
}) {
  const [view, setView] = useState('GAME');
  const [name, setName] = useState(displayName);
  const [code, setCode] = useState(gameCode);
  const [pendingCode, setPendingCode] = useState(''); // Code waiting for username
  const [isCreating, setIsCreating] = useState(false); // Track if we're creating vs joining
  const [gameState, setGameState] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [myId, setMyId] = useState(playerId);
  const [gameLogEntries, setGameLogEntries] = useState([]);
  const [logsExpanded, setLogsExpanded] = useState(true);
  const [timer, setTimer] = useState(0);
  const [selectedPlayerRole, setSelectedPlayerRole] = useState(null); // For host role viewing modal
  const [nightTarget, setNightTarget] = useState(null); // Track who we targeted at night
  const [frameTarget, setFrameTarget] = useState(null); // Track frame target for Vampire Framer (separate from nightTarget)
  const [voteTarget, setVoteTarget] = useState(null); // Track who we voted for
  const [roleRevealed, setRoleRevealed] = useState(false); // Track if role is revealed
  const [jailChatInput, setJailChatInput] = useState(''); // Jail chat input
  const [jailChat, setJailChat] = useState([]); // Jail chat messages
  const [executionPending, setExecutionPending] = useState(false); // Track if Jailor decided to execute
  const [gameChat, setGameChat] = useState([]); // Game chat messages
  const [chatInput, setChatInput] = useState(''); // Game chat input
  const [editingNPC, setEditingNPC] = useState(null); // NPC being edited (holds { id, name, personality, talkingStyle, elevenlabsVoiceId })
  const [elevenlabsOptions, setElevenlabsOptions] = useState({ models: [], voices: [] }); // ElevenLabs models and voices
  const prevGameState = useRef(null); // Track previous game state for transitions
  const chatMessagesRef = useRef(null); // Ref for auto-scrolling chat
  const jailChatMessagesRef = useRef(null); // Ref for auto-scrolling jail chat
  const ttsAudioQueue = useRef([]); // Queue for TTS audio to prevent overlap
  const ttsIsPlaying = useRef(false); // Track if TTS audio is currently playing
  const publicLogCountRef = useRef(0);
  const previousLoggedPhaseRef = useRef(null);
  const roleAutoShownRef = useRef(false);

  // Voice input (Speech-to-Text) state
  const [isRecording, setIsRecording] = useState(false);
  const [sttAvailable, setSTTAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false); // For VAD mode
  const [audioLevel, setAudioLevel] = useState(0); // For VAD visual indicator
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const vadTimeoutRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const micPermissionRequestedRef = useRef(false); // Track if we've requested mic permission this game

  // Settings - also persist these
  const [settings, setSettings] = useState(() => {
    const defaultSettings = {
      discussionTime: 120,
      nightTime: 60,
      votingTime: 15,
      revealRole: true,
      chatEnabled: false,
      enableAI: false,
      enableTTS: false,
      enableSTT: false,
      voiceInputMode: 'push-to-talk',
      ttsProvider: 'google',
      sttProvider: 'deepgram',
      elevenlabsModel: 'eleven_turbo_v2_5',
      npcNationality: 'english',
      npcAllowedRoles: {
        Investigator: true,
        Lookout: true,
        Doctor: true,
        Jailor: true,
        Vampire: true,
        'Vampire Framer': true,
        Jester: true,
        Citizen: true
      }
    };
    return defaultSettings;
  });

  // Role configuration for custom games
  const [roleConfig, setRoleConfig] = useState(() => {
    const defaultConfig = {
      useDefault: true,
      Investigator: 1,
      Lookout: 1,
      Doctor: 1,
      Jailor: 0,
      Vampire: 1,
      'Vampire Framer': 0,
      Jester: 1
    };
    return defaultConfig;
  });

  const [selectedTheme, setSelectedTheme] = useState(initialTheme);

  useEffect(() => {
    setSelectedTheme(initialTheme);
  }, [initialTheme]);
  
  // Voice Activity Detection (VAD) functions - defined early to avoid "use before define"
  const stopVADListening = useCallback(() => {
    setIsListening(false);
    setAudioLevel(0);

    if (vadTimeoutRef.current) {
      cancelAnimationFrame(vadTimeoutRef.current);
      vadTimeoutRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const startVADListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Set up audio analysis for VAD
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let isCurrentlyRecording = false;
      let audioChunks = [];
      let mediaRecorder = null;
      let cooldownUntil = 0; // Timestamp until which new recordings are blocked

      const SILENCE_THRESHOLD = 25; // Audio level threshold
      const SILENCE_DURATION = 800; // ms of silence before stopping recording
      const COOLDOWN_DURATION = 1000; // ms to wait after sending before allowing new recording

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, average * 2)); // Scale for visual indicator

        const now = Date.now();

        if (average > SILENCE_THRESHOLD) {
          // Voice detected
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }

          // Only start recording if not in cooldown period
          if (!isCurrentlyRecording && now >= cooldownUntil) {
            // Start recording
            isCurrentlyRecording = true;
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
              }
            };

            mediaRecorder.onstop = () => {
              if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                  const base64Audio = reader.result.split(',')[1];
                  socket.emit('voice_audio_chunk', { code, audioChunk: base64Audio });
                  // Set cooldown to prevent immediate re-recording
                  cooldownUntil = Date.now() + COOLDOWN_DURATION;
                };
                reader.readAsDataURL(audioBlob);
              }
            };

            mediaRecorder.start();
            setIsRecording(true);
          }
        } else if (isCurrentlyRecording && !silenceTimeoutRef.current) {
          // Silence detected while recording, start countdown
          silenceTimeoutRef.current = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
              isCurrentlyRecording = false;
              setIsRecording(false);
            }
            silenceTimeoutRef.current = null;
          }, SILENCE_DURATION);
        }

        vadTimeoutRef.current = requestAnimationFrame(checkAudioLevel);
      };

      setIsListening(true);
      checkAudioLevel();
    } catch (err) {
      console.error('[Voice VAD] Microphone access denied:', err);
      alert('Prieiga prie mikrofono nesuteikta. Naršyklės nustatymuose leiskite naudoti mikrofoną.');
    }
  }, [code, socket]);

  useEffect(() => {
    setCode(gameCode);
    setMyId(playerId);
    setName(displayName);
    setView('GAME');
    socket.emit('rejoin_game', { code: gameCode, playerId });
  }, [displayName, gameCode, playerId, socket]);

  // 1.2 Handle phase transitions/side-effects
  useEffect(() => {
    const prev = prevGameState.current;
    if (!gameState) return;

    // Reset nightTarget and frameTarget when entering a new NIGHT phase (different round)
    if (gameState.state === 'NIGHT' && (!prev || prev.state !== 'NIGHT' || prev.round !== gameState.round)) {
      setNightTarget(null);
      setFrameTarget(null);
      setJailChat([]); // Reset jail chat for new night
      setExecutionPending(false); // Reset execution state for new night
    }
    // Reset voteTarget when entering DAY_VOTE
    if (gameState.state === 'DAY_VOTE' && prev?.state !== 'DAY_VOTE') {
      setVoteTarget(null);
    }
    // Reset game chat when entering DAY_DISCUSS (cleared by server)
    if (gameState.state === 'DAY_DISCUSS' && prev?.state !== 'DAY_DISCUSS') {
      setGameChat(gameState.gameChat || []);
    }

    // Sync game chat from gameState
    if (gameState.gameChat && JSON.stringify(gameState.gameChat) !== JSON.stringify(gameChat)) {
      setGameChat(gameState.gameChat);
    }

    // Sync jail chat from gameState when we first enter jail (jailInfo appears)
    if (gameState.jailInfo && (!prev?.jailInfo) && gameState.jailInfo.jailChat) {
      setJailChat(gameState.jailInfo.jailChat);
    }

    prevGameState.current = gameState;
  }, [gameState, gameChat]);

  useEffect(() => {
    const storageKey = getRoleAutoShownKey(gameCode);

    if (gameState?.state === 'LOBBY') {
      localStorage.removeItem(storageKey);
      roleAutoShownRef.current = false;
      setRoleRevealed(false);
      return;
    }

    const gameHasStarted = gameState?.state
      && gameState.state !== 'GAME_OVER';

    if (gameHasStarted && myRole?.role && !roleAutoShownRef.current) {
      roleAutoShownRef.current = true;
      const roleWasAlreadyShown = localStorage.getItem(storageKey) === 'true';

      if (!roleWasAlreadyShown) {
        localStorage.setItem(storageKey, 'true');
        setRoleRevealed(true);
      }
    }
  }, [gameCode, gameState?.state, myRole?.role]);

  // Request microphone permission when game starts (if voice chat is enabled)
  useEffect(() => {
    // Check if game is now in a playing state (not LOBBY)
    const isPlaying = gameState?.state && gameState.state !== 'LOBBY';

    // Check if voice chat is enabled (using gameState settings which are broadcast from server)
    const voiceChatEnabled = gameState?.enableSTT && sttAvailable;

    // Reset the flag when returning to LOBBY
    if (gameState?.state === 'LOBBY') {
      micPermissionRequestedRef.current = false;
      return;
    }

    // Request permission once when game starts with voice chat enabled
    if (isPlaying && voiceChatEnabled && !micPermissionRequestedRef.current) {
      micPermissionRequestedRef.current = true;
      console.log('[Voice] Game started with voice chat enabled - requesting microphone permission');
      // Request microphone permission but immediately release it
      // This prompts the user without keeping the mic active
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('[Voice] Microphone permission granted');
          // Stop all tracks immediately - we just wanted permission
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.error('[Voice] Microphone permission denied:', err);
          alert('Prieiga prie mikrofono nesuteikta. Balso pokalbis neveiks. Naršyklės nustatymuose leiskite naudoti mikrofoną.');
        });
    }
  }, [gameState?.state, gameState?.enableSTT, sttAvailable]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [gameChat]);

  // Auto-scroll jail chat to bottom when new messages arrive
  useEffect(() => {
    if (jailChatMessagesRef.current) {
      jailChatMessagesRef.current.scrollTop = jailChatMessagesRef.current.scrollHeight;
    }
  }, [jailChat]);

  // 1.5 Theme switching based on game phase and user selection
  useEffect(() => {
    const isDayPhase = gameState?.state === 'DAY_DISCUSS' || gameState?.state === 'DAY_VOTE';
    const isNightPhase = gameState?.state === 'NIGHT';
    const isInGame = gameState?.state && gameState.state !== 'LOBBY';
    const gameRoot = document.getElementById('vampires-game-root');
    if (!gameRoot) return;

    // Always remove phase attribute first
    gameRoot.removeAttribute('data-phase');

    if (selectedTheme === 'christmas') {
      // Christmas theme with day/night variants
      if (isInGame) {
        if (isDayPhase) {
          gameRoot.setAttribute('data-theme', 'christmas-day');
        } else if (isNightPhase) {
          gameRoot.setAttribute('data-theme', 'christmas-night');
        } else {
          gameRoot.setAttribute('data-theme', 'christmas');
        }
      } else {
        // Menu/lobby uses base christmas theme
        gameRoot.setAttribute('data-theme', 'christmas');
      }
    } else if (isInGame) {
      // During gameplay with non-Christmas theme, use day/night themes
      if (isDayPhase) {
        gameRoot.setAttribute('data-theme', 'day');
      } else if (isNightPhase) {
        gameRoot.removeAttribute('data-theme');
        gameRoot.setAttribute('data-phase', 'night');
      } else {
        gameRoot.removeAttribute('data-theme');
      }
    } else {
      // In menu/lobby with non-Christmas theme
      if (selectedTheme === 'day') {
        gameRoot.setAttribute('data-theme', 'day');
      } else {
        gameRoot.removeAttribute('data-theme');
      }
    }

    // Cleanup on unmount
    return () => {
      gameRoot.removeAttribute('data-theme');
      gameRoot.removeAttribute('data-phase');
    };
  }, [gameState?.state, selectedTheme]);

  // Auto-start/stop VAD listening based on game phase and settings
  useEffect(() => {
    const isDayDiscuss = gameState?.state === 'DAY_DISCUSS';
    const myPlayer = gameState?.players.find(p => p.id === myId);
    // Use gameState settings (broadcast from server) so all players get the host's settings
    const shouldAutoStartVAD =
      isDayDiscuss &&
      myPlayer?.alive &&
      gameState?.voiceInputMode === 'voice-activity' &&
      gameState?.enableSTT &&
      sttAvailable;

    if (shouldAutoStartVAD && !isListening) {
      startVADListening();
    } else if (!isDayDiscuss && isListening) {
      stopVADListening();
    }

    // Cleanup on unmount
    return () => {
      if (isListening) {
        stopVADListening();
      }
    };
  }, [gameState?.state, gameState?.players, myId, gameState?.voiceInputMode, gameState?.enableSTT, sttAvailable, isListening, startVADListening, stopVADListening]);

  // Handle theme change
  const changeTheme = (theme) => {
    setSelectedTheme(theme);
    localStorage.setItem('vampire_theme', theme);
  };

  // 2. Socket Listeners - setup once on mount
  // Use refs to access current values inside socket handlers to avoid stale closures
  const nameRef = useRef(name);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  // Helpers
  const saveSession = useCallback((c, id, n) => {
    localStorage.setItem('vampire_code', c);
    localStorage.setItem('vampire_id', id);
    localStorage.setItem('vampire_name', n);
    localStorage.setItem('vampire_view', 'LOBBY');
    setCode(c);
    setMyId(id);
  }, []);

  const appendGameLog = useCallback((message, type = 'private') => {
    setGameLogEntries(current => [...current, createGameLogEntry(message, type)]);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('vampire_code');
    localStorage.removeItem('vampire_id');
    localStorage.removeItem('vampire_name');
    localStorage.removeItem('vampire_view');
    localStorage.removeItem('vampire_role');
    localStorage.removeItem('vampire_private_msg');
    localStorage.removeItem('vampire_settings');
    localStorage.removeItem('vampire_role_config');
    localStorage.removeItem(getRoleAutoShownKey(gameCode));
    setView('GAME');
    setCode(gameCode);
    setMyId(playerId);
    setMyRole(null);
    setGameLogEntries([]);
    publicLogCountRef.current = 0;
    previousLoggedPhaseRef.current = null;
    roleAutoShownRef.current = false;
  }, [gameCode, playerId]);

  useEffect(() => {
    const handleGameCreated = ({ code, playerId }) => {
      saveSession(code, playerId, nameRef.current);
      setView('LOBBY');
    };

    const handleJoined = ({ code, playerId }) => {
      saveSession(code, playerId, nameRef.current);
      setMyId(playerId);
      setView('GAME');
    };

    const handleGameUpdate = (data) => {
      const publicLogs = Array.isArray(data.logs) ? data.logs : [];
      if (publicLogs.length < publicLogCountRef.current) {
        publicLogCountRef.current = 0;
      }

      const freshPublicLogs = publicLogs
        .slice(publicLogCountRef.current)
        .map(log => createGameLogEntry(log, 'public'));
      const phaseChanged = data.state !== previousLoggedPhaseRef.current;
      const phaseLog = phaseChanged ? getPhaseLogEntry(data.state, data.round) : null;

      if (freshPublicLogs.length || phaseLog) {
        setGameLogEntries(current => [
          ...current,
          ...freshPublicLogs,
          ...(phaseLog ? [createGameLogEntry(phaseLog.message, phaseLog.type)] : []),
        ]);
      }

      publicLogCountRef.current = publicLogs.length;
      previousLoggedPhaseRef.current = data.state;
      setGameState(data);
      setTimer(data.timer);
      // Update view based on game state
      if (data.state === 'LOBBY') {
        setView('LOBBY');
        localStorage.setItem('vampire_view', 'LOBBY');
      } else if (data.state !== 'LOBBY') {
        setView('GAME');
        localStorage.setItem('vampire_view', 'GAME');
      }
    };

    const handleTimerUpdate = (t) => setTimer(t);

    const handleRoleInfo = (data) => {
      setMyRole(data);
      localStorage.setItem('vampire_role', JSON.stringify(data));
    };

    const handlePrivateMessage = (msg) => {
      appendGameLog(msg, 'private');
    };

    const handleKicked = () => {
      clearSession();
      alert("Buvote pašalintas iš žaidimo.");
      window.location.reload();
    };

    const handleError = (msg) => {
      // If error related to rejoin, clear storage
      if (msg === 'Game no longer exists.') clearSession();
      alert(translateServerMessage(msg));
    };

    const handlePlayerRoleInfo = (data) => {
      setSelectedPlayerRole(data);
    };

    const handleJailChatUpdate = (chatMessages) => {
      setJailChat(chatMessages);
    };

    const handleChatUpdate = (chatMessages) => {
      setGameChat(chatMessages);
    };

    const handleNPCDetails = (data) => {
      setEditingNPC(data);
    };

    const handleElevenlabsOptions = (data) => {
      setElevenlabsOptions(data);
    };

    // TTS Audio handler with queue for sequential playback
    const handleTTSAudio = ({ audio, senderName, senderId }) => {
      console.log(`[TTS] Received audio for ${senderName}`);

      // Add to queue
      ttsAudioQueue.current.push({ audio, senderName, senderId });

      // Process queue if not already playing
      const processQueue = () => {
        if (ttsIsPlaying.current || ttsAudioQueue.current.length === 0) return;

        ttsIsPlaying.current = true;
        const { audio } = ttsAudioQueue.current.shift();

        try {
          // Decode base64 to binary
          const binaryString = atob(audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Create blob and audio element
          const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audioElement = new Audio(audioUrl);

          audioElement.onended = () => {
            URL.revokeObjectURL(audioUrl);
            ttsIsPlaying.current = false;
            processQueue(); // Play next in queue
          };

          audioElement.onerror = (err) => {
            console.error('[TTS] Audio playback error:', err);
            URL.revokeObjectURL(audioUrl);
            ttsIsPlaying.current = false;
            processQueue(); // Try next in queue
          };

          audioElement.play().catch(err => {
            console.error('[TTS] Failed to play audio:', err);
            ttsIsPlaying.current = false;
            processQueue();
          });
        } catch (err) {
          console.error('[TTS] Error processing audio:', err);
          ttsIsPlaying.current = false;
          processQueue();
        }
      };

      processQueue();
    };

    socket.on('game_created', handleGameCreated);
    socket.on('joined', handleJoined);
    socket.on('game_update', handleGameUpdate);
    socket.on('timer_update', handleTimerUpdate);
    socket.on('role_info', handleRoleInfo);
    socket.on('private_message', handlePrivateMessage);
    socket.on('kicked', handleKicked);
    socket.on('error', handleError);
    socket.on('player_role_info', handlePlayerRoleInfo);
    socket.on('jail_chat_update', handleJailChatUpdate);
    socket.on('chat_update', handleChatUpdate);
    socket.on('npc_details', handleNPCDetails);
    socket.on('tts_audio', handleTTSAudio);
    socket.on('elevenlabs_options', handleElevenlabsOptions);

    // STT availability handler
    const handleSTTAvailable = (available) => {
      setSTTAvailable(available);
    };
    socket.on('stt_available', handleSTTAvailable);

    // Request ElevenLabs options and STT availability on mount
    socket.emit('get_elevenlabs_options');
    socket.emit('get_stt_available');

    // Cleanup: remove only the specific listeners we added
    return () => {
      socket.off('game_created', handleGameCreated);
      socket.off('joined', handleJoined);
      socket.off('game_update', handleGameUpdate);
      socket.off('timer_update', handleTimerUpdate);
      socket.off('role_info', handleRoleInfo);
      socket.off('private_message', handlePrivateMessage);
      socket.off('kicked', handleKicked);
      socket.off('error', handleError);
      socket.off('player_role_info', handlePlayerRoleInfo);
      socket.off('jail_chat_update', handleJailChatUpdate);
      socket.off('chat_update', handleChatUpdate);
      socket.off('npc_details', handleNPCDetails);
      socket.off('tts_audio', handleTTSAudio);
      socket.off('elevenlabs_options', handleElevenlabsOptions);
      socket.off('stt_available', handleSTTAvailable);
    };
    // Debug connection events removed
  }, [appendGameLog, clearSession, saveSession, socket]);

  // Actions
  const initiateCreateGame = () => {
    setIsCreating(true);
    setView('ENTER_USERNAME');
  };

  const initiateJoinGame = () => {
    if (!code.trim()) return alert("Įveskite kodą");
    setPendingCode(code.toUpperCase());
    setIsCreating(false);
    setView('ENTER_USERNAME');
  };

  const submitUsername = () => {
    const finalName = name.trim() || generateRandomUsername();
    setName(finalName);

    if (isCreating) {
      socket.emit('create_game', { name: finalName, settings, roleConfig });
    } else {
      socket.emit('join_game', { code: pendingCode, name: finalName });
    }
  };

  const kickPlayer = (targetId) => {
    if (window.confirm("Pašalinti šį žaidėją?")) {
      socket.emit('kick_player', { code, targetId });
    }
  };

  const startGame = () => socket.emit('start_game', { code, roleConfig });
  const sendAction = (targetId, type) => {
    // Special handling for EXECUTE - no targetId, target is the jailed player
    // Server sends the private message, so we don't add one here
    if (type === 'EXECUTE') {
      socket.emit('night_action', { code, action: { targetId: null, type } });
      return;
    }

    // Special handling for FRAME - uses separate frameTarget state so Vampire Framer can do both FRAME and BITE
    if (type === 'FRAME') {
      // Toggle behavior: if clicking same target, clear it
      if (frameTarget === targetId) {
        socket.emit('night_action', { code, action: { targetId: null, type, clear: true } });
        setFrameTarget(null);
        appendGameLog('Klastojimas atšauktas', 'private');
        return;
      }
      socket.emit('night_action', { code, action: { targetId, type } });
      setFrameTarget(targetId);
      const targetPlayer = gameState?.players.find(p => p.id === targetId);
      appendGameLog(`Klastojami žaidėjo ${targetPlayer?.name || 'nežinomas žaidėjas'} duomenys`, 'private');
      return;
    }

    // Toggle behavior: if clicking same target with same action, clear it
    if (nightTarget?.targetId === targetId && nightTarget?.type === type) {
      socket.emit('night_action', { code, action: { targetId: null, type, clear: true } });
      setNightTarget(null);
      appendGameLog('Veiksmas atšauktas', 'private');
      return;
    }
    socket.emit('night_action', { code, action: { targetId, type } });
    setNightTarget({ targetId, type });
    const targetPlayer = gameState?.players.find(p => p.id === targetId);
    const actionNames = { 'INVESTIGATE': 'Tikrinamas', 'LOOKOUT': 'Stebimas', 'BITE': 'Balsuojama už', 'HEAL': 'Gydomas', 'JAIL': 'Kalinamas', 'FRAME': 'Klastojami duomenys apie' };
    appendGameLog(`${actionNames[type] || 'Veiksmas su'} ${targetPlayer?.name || 'nežinomu žaidėju'}`, 'private');
  };
  const vote = (targetId) => {
    // Toggle behavior: if clicking same target, unvote
    if (voteTarget === targetId) {
      socket.emit('day_vote', { code, targetId: null });
      setVoteTarget(null);
      return;
    }
    socket.emit('day_vote', { code, targetId });
    setVoteTarget(targetId);
  };
  const skipTimer = () => socket.emit('skip_timer', { code });
  const endGame = () => {
    if (window.confirm("Ar tikrai norite baigti žaidimą?")) {
      socket.emit('end_game', { code });
    }
  };

  const addNPC = () => socket.emit('add_npc', { code });

  const viewPlayerRole = (targetId) => {
    socket.emit('get_player_role', { code, targetId });
  };

  const changePlayerRole = (targetId, newRole) => {
    socket.emit('change_player_role', { code, targetId, newRole });
  };

  const changePlayerAliveStatus = (targetId, isAlive) => {
    socket.emit('set_player_alive_status', { code, targetId, alive: isAlive });
  };

  // Voice recording functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          socket.emit('voice_audio_chunk', { code, audioChunk: base64Audio });
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('[Voice] Microphone access denied:', err);
      alert('Prieiga prie mikrofono nesuteikta. Naršyklės nustatymuose leiskite naudoti mikrofoną.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // (VAD functions moved higher up to avoid "use before define")

  // --- RENDER ---

  if (view !== 'GAME') {
    return (
      <div id="vampires-game-root" className="vampires-shell container center-screen">
        {selectedTheme === 'christmas' && <Snowfall />}
        <div className="card menu-card">
          <h2>Ruošiamas jūsų klasės žaidimas...</h2>
        </div>
      </div>
    );
  }

  if (view === 'MENU') {
    return (
      <div id="vampires-game-root" className="vampires-shell container center-screen">
        {selectedTheme === 'christmas' && <Snowfall />}
        <h1 className="title-blood">VAMPYRAI</h1>

        <div className="row">
          <div className="card menu-card">
            <h3>Sukurti kambarį</h3>
            <p className="hint-text">Žaidimo nustatymus galėsite pasirinkti laukimo kambaryje</p>
            <button className="btn-primary" onClick={initiateCreateGame}>Sukurti žaidimą</button>
          </div>

          <div className="card menu-card">
            <h3>Prisijungti prie kambario</h3>
            <input className="input-modern" placeholder="KAMBARIO KODAS" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
            <button className="btn-secondary" onClick={initiateJoinGame}>Prisijungti prie žaidimo</button>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="theme-selector">
          <button
            className={`theme-btn theme-dark ${selectedTheme === 'dark' ? 'active' : ''}`}
            onClick={() => changeTheme('dark')}
            title="Tamsi tema"
          >
            🌙
          </button>
          <button
            className={`theme-btn theme-light ${selectedTheme === 'day' ? 'active' : ''}`}
            onClick={() => changeTheme('day')}
            title="Šviesi tema"
          >
            ☀️
          </button>
          <button
            className={`theme-btn theme-christmas ${selectedTheme === 'christmas' ? 'active' : ''}`}
            onClick={() => changeTheme('christmas')}
            title="Kalėdinė tema"
          >
            🎄
          </button>
        </div>
      </div>
    );
  }

  if (view === 'ENTER_USERNAME') {
    return (
      <div id="vampires-game-root" className="vampires-shell container center-screen">
        {selectedTheme === 'christmas' && <Snowfall />}
        <h1 className="title-blood">VAMPYRAI</h1>
        <div className="card menu-card username-card">
          <h3>{isCreating ? 'Susikurkite tapatybę' : 'Įveskite savo tapatybę'}</h3>
          <p className="hint-text">Palikite tuščią, kad vardas būtų sugeneruotas atsitiktinai</p>
          <div className="input-group">
            <input
              className="input-modern"
              placeholder="Įveskite vardą (nebūtina)"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && submitUsername()}
              autoFocus
            />
          </div>
          <div className="button-row">
            <button className="btn-secondary" onClick={() => { setView('MENU'); setName(''); }}>Atgal</button>
            <button className="btn-primary" onClick={submitUsername}>
              {name.trim() ? 'Tęsti' : 'Sugeneruoti atsitiktinį vardą'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'LOBBY') {
    const isHost = gameState?.host === myId;
    const playerCount = gameState?.players?.length || 0;

    // Role configuration helpers
    const roleData = [
      { key: 'Investigator', icon: '🔍', alignment: 'good', name: getRoleLabel('Investigator') },
      { key: 'Lookout', icon: '👁️', alignment: 'good', name: getRoleLabel('Lookout') },
      { key: 'Doctor', icon: '💉', alignment: 'good', name: getRoleLabel('Doctor') },
      { key: 'Jailor', icon: '🔒', alignment: 'good', name: getRoleLabel('Jailor') },
      { key: 'Vampire', icon: '🧛', alignment: 'evil', name: getRoleLabel('Vampire') },
      { key: 'Vampire Framer', icon: '🎭', alignment: 'evil', name: getRoleLabel('Vampire Framer') },
      { key: 'Jester', icon: '🃏', alignment: 'neutral', name: getRoleLabel('Jester') }
    ];

    const totalConfiguredRoles = roleConfig.Investigator + roleConfig.Lookout + roleConfig.Doctor + (roleConfig.Jailor || 0) + roleConfig.Vampire + (roleConfig['Vampire Framer'] || 0) + roleConfig.Jester;
    const citizenCount = Math.max(0, playerCount - totalConfiguredRoles);

    const updateRoleCount = (roleKey, delta) => {
      const newCount = Math.max(0, (roleConfig[roleKey] || 0) + delta);
      const newConfig = { ...roleConfig, [roleKey]: newCount };
      setRoleConfig(newConfig);
      localStorage.setItem('vampire_role_config', JSON.stringify(newConfig));
    };

    const toggleRoleMode = (useDefault) => {
      const newConfig = { ...roleConfig, useDefault };
      setRoleConfig(newConfig);
      localStorage.setItem('vampire_role_config', JSON.stringify(newConfig));
    };

    return (
      <div id="vampires-game-root" className="vampires-shell container">
        {selectedTheme === 'christmas' && <Snowfall />}
        <div className="lobby-header">
          <h1>Ruošiamas klasės žaidimas...</h1>
        </div>

        {/* NPC Edit Modal */}
        {editingNPC && (
          <div className="modal-overlay" onClick={() => setEditingNPC(null)}>
            <div className="modal-content npc-edit-modal" onClick={e => e.stopPropagation()}>
              <h2>🤖 Redaguoti NPC</h2>

              <div className="npc-edit-form">
                <div className="form-group">
                  <label>Vardas</label>
                  <input
                    type="text"
                    className="input-modern"
                    value={editingNPC.name}
                    onChange={e => setEditingNPC({ ...editingNPC, name: e.target.value })}
                    placeholder="NPC vardas"
                  />
                </div>

                <div className="form-group">
                  <label>Asmenybės aprašymas</label>
                  <textarea
                    className="input-modern textarea-modern"
                    value={editingNPC.personality}
                    onChange={e => setEditingNPC({ ...editingNPC, personality: e.target.value })}
                    placeholder="pvz., paranojiškas, agresyvus, analitiškas, tylus..."
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Kalbėjimo stilius</label>
                  <textarea
                    className="input-modern textarea-modern"
                    value={editingNPC.talkingStyle}
                    onChange={e => setEditingNPC({ ...editingNPC, talkingStyle: e.target.value })}
                    placeholder="pvz., vartoja žargoną, kalba formaliai, mikčioja, kalba mįslėmis..."
                    rows={3}
                  />
                </div>

                {settings.ttsProvider === 'elevenlabs' && settings.enableTTS && (
                  <div className="form-group">
                    <label>🔊 „ElevenLabs“ balsas</label>
                    <select
                      className="input-modern"
                      value={editingNPC.elevenlabsVoiceId || ''}
                      onChange={e => setEditingNPC({ ...editingNPC, elevenlabsVoiceId: e.target.value })}
                    >
                      <option value="">Atsitiktinis (parenkamas automatiškai)</option>
                      {elevenlabsOptions.voices.map(voice => (
                        <option key={voice.id} value={voice.id}>{voice.name} ({getGenderLabel(voice.gender)})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="button-row">
                <button className="btn-secondary" onClick={() => setEditingNPC(null)}>Atšaukti</button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    socket.emit('update_npc', {
                      code,
                      targetId: editingNPC.id,
                      name: editingNPC.name,
                      personality: editingNPC.personality,
                      talkingStyle: editingNPC.talkingStyle,
                      elevenlabsVoiceId: editingNPC.elevenlabsVoiceId || null
                    });
                    setEditingNPC(null);
                  }}
                >
                  Išsaugoti pakeitimus
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="player-grid">
          {gameState?.players.map(p => (
            <div
              key={p.id}
              className={`player-chip ${p.isNPC ? 'npc-player' : ''} ${isHost && p.isNPC ? 'npc-editable' : ''}`}
              onClick={() => {
                if (isHost && p.isNPC) {
                  socket.emit('get_npc_details', { code, targetId: p.id });
                }
              }}
            >
              <div className="avatar">{p.isNPC ? '🤖' : p.name.charAt(0).toUpperCase()}</div>
              <span className="player-name">{p.name} {p.id === myId ? '(jūs)' : ''}</span>
              {isHost && p.isNPC && <span className="npc-edit-icon">✏️</span>}
              {isHost && p.id !== myId && (
                <button className="btn-kick" onClick={(e) => { e.stopPropagation(); kickPlayer(p.id); }}>×</button>
              )}
            </div>
          ))}
        </div>

        {isHost && (
          <button className="btn-secondary btn-add-npc" onClick={addNPC}>
            + Pridėti NPC žaidėją
          </button>
        )}

        {/* Game Settings Panel - Host Only */}
        {isHost && (
          <div className="game-settings-panel">
            <div className="game-settings-header">
              <h3>⚙️ Žaidimo nustatymai</h3>
            </div>
            <div className="game-settings-grid">
              <div className="game-setting-item">
                <label>Diskusijos laikas</label>
                <div className="game-setting-input-row">
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={settings.discussionTime}
                    onChange={e => {
                      const newSettings = { ...settings, discussionTime: parseInt(e.target.value) || 120 };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  />
                  <span className="setting-unit">sek.</span>
                </div>
              </div>
              <div className="game-setting-item">
                <label>Nakties laikas</label>
                <div className="game-setting-input-row">
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={settings.nightTime}
                    onChange={e => {
                      const newSettings = { ...settings, nightTime: parseInt(e.target.value) || 60 };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  />
                  <span className="setting-unit">sek.</span>
                </div>
              </div>
              <div className="game-setting-item">
                <label>Balsavimo laikas</label>
                <div className="game-setting-input-row">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.votingTime}
                    onChange={e => {
                      const newSettings = { ...settings, votingTime: parseInt(e.target.value) || 15 };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  />
                  <span className="setting-unit">sek.</span>
                </div>
              </div>
              <div className="game-setting-item checkbox-setting">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.chatEnabled !== false}
                    onChange={e => {
                      const newSettings = { ...settings, chatEnabled: e.target.checked };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  />
                  Įjungti pokalbį
                </label>
              </div>
              {settings.enableAI && (
                <div className="game-setting-item">
                  <label>NPC kalba</label>
                  <select
                    className="setting-select"
                    value={settings.npcNationality || 'english'}
                    onChange={e => {
                      const newSettings = { ...settings, npcNationality: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  >
                    <option value="english">Anglų</option>
                    <option value="lithuanian">Lietuvių</option>
                  </select>
                </div>
              )}
              {settings.enableAI && (
                <div className="game-setting-item">
                  <label>NPC leidžiami vaidmenys:</label>
                  <div className="npc-roles-grid">
                    {['Investigator', 'Lookout', 'Doctor', 'Jailor', 'Vampire', 'Vampire Framer', 'Jester', 'Citizen'].map(role => (
                      <label key={role} className="npc-role-checkbox">
                        <input
                          type="checkbox"
                          checked={settings.npcAllowedRoles?.[role] !== false}
                          onChange={e => {
                            const newNpcAllowedRoles = {
                              ...settings.npcAllowedRoles,
                              [role]: e.target.checked
                            };
                            const newSettings = { ...settings, npcAllowedRoles: newNpcAllowedRoles };
                            setSettings(newSettings);
                            localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                            socket.emit('update_settings', { code, settings: newSettings });
                          }}
                        />
                        <span className="role-name">{getRoleLabel(role)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {settings.enableAI && (
                <div className="game-setting-item checkbox-setting">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.enableTTS || false}
                      onChange={e => {
                        const newSettings = { ...settings, enableTTS: e.target.checked };
                        setSettings(newSettings);
                        localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                        socket.emit('update_settings', { code, settings: newSettings });
                      }}
                    />
                    🔊 NPC teksto įgarsinimas
                  </label>
                </div>
              )}
              {settings.enableAI && settings.enableTTS && (
                <div className="game-setting-item">
                  <label>Balso sintezės teikėjas:</label>
                  <select
                    value={settings.ttsProvider || 'google'}
                    onChange={e => {
                      const newSettings = { ...settings, ttsProvider: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  >
                    <option value="google">Google Cloud TTS</option>
                    <option value="elevenlabs">ElevenLabs</option>
                  </select>
                </div>
              )}
              {settings.enableAI && settings.enableTTS && settings.ttsProvider === 'elevenlabs' && (
                <div className="game-setting-item">
                  <label>„ElevenLabs“ modelis:</label>
                  <select
                    value={settings.elevenlabsModel || 'eleven_turbo_v2_5'}
                    onChange={e => {
                      const newSettings = { ...settings, elevenlabsModel: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  >
                    {elevenlabsOptions.models.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {settings.enableAI && (
                <div className="game-setting-item checkbox-setting">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.enableSTT || false}
                      disabled={!sttAvailable}
                      onChange={e => {
                        const newSettings = { ...settings, enableSTT: e.target.checked };
                        setSettings(newSettings);
                        localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                        socket.emit('update_settings', { code, settings: newSettings });
                      }}
                    />
                    🎤 Įjungti balso pokalbį {!sttAvailable && '(nepasiekiama)'}
                  </label>
                </div>
              )}
              {settings.enableAI && settings.enableSTT && sttAvailable && (
                <div className="game-setting-item">
                  <label>Kalbos atpažinimo teikėjas:</label>
                  <select
                    value={settings.sttProvider || 'deepgram'}
                    onChange={e => {
                      const newSettings = { ...settings, sttProvider: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  >
                    <option value="deepgram">Deepgram NOVA-3</option>
                    <option value="google">Google Cloud STT</option>
                  </select>
                </div>
              )}
              {settings.enableAI && settings.enableSTT && sttAvailable && (
                <div className="game-setting-item">
                  <label>Balso įvesties režimas:</label>
                  <select
                    className="setting-select"
                    value={settings.voiceInputMode || 'push-to-talk'}
                    onChange={e => {
                      const newSettings = { ...settings, voiceInputMode: e.target.value };
                      setSettings(newSettings);
                      localStorage.setItem('vampire_settings', JSON.stringify(newSettings));
                      socket.emit('update_settings', { code, settings: newSettings });
                    }}
                  >
                    <option value="push-to-talk">Laikyti ir kalbėti</option>
                    <option value="voice-activity">Balso aktyvumo aptikimas</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Role Configuration Panel - Host Only */}
        {isHost && (
          <div className="role-config-panel">
            <div className="role-config-header">
              <h3>🎭 Vaidmenų konfigūracija</h3>
              <div className="role-config-toggle">
                <button
                  className={`toggle-btn ${roleConfig.useDefault ? 'active' : ''}`}
                  onClick={() => toggleRoleMode(true)}
                >
                  Numatytoji
                </button>
                <button
                  className={`toggle-btn ${!roleConfig.useDefault ? 'active' : ''}`}
                  onClick={() => toggleRoleMode(false)}
                >
                  Pasirinktinė
                </button>
              </div>
            </div>

            {roleConfig.useDefault ? (
              <div className="role-config-default-message">
                Vaidmenys bus automatiškai paskirti pagal žaidėjų skaičių.
                <br />
                <small>(maždaug po 10 % šerifų, stebėtojų ir vampyrų, 1 juokdarys, likusieji – miestiečiai)</small>
              </div>
            ) : (
              <>
                <div className="role-config-grid">
                  {roleData.map(role => (
                    <div key={role.key} className={`role-config-card ${role.alignment}`}>
                      <div className="role-config-card-header">
                        <div className="role-config-card-title">
                          <span className="role-config-icon">{role.icon}</span>
                          <span className="role-config-name">{role.name}</span>
                        </div>
                        <span className={`role-config-alignment ${role.alignment}`}>
                          {getAlignmentLabel(role.alignment)}
                        </span>
                      </div>
                      <div className="role-config-counter">
                        <button
                          className="counter-btn"
                          onClick={() => updateRoleCount(role.key, -1)}
                          disabled={roleConfig[role.key] <= 0}
                        >
                          −
                        </button>
                        <span className="counter-value">{roleConfig[role.key] || 0}</span>
                        <button
                          className="counter-btn"
                          onClick={() => updateRoleCount(role.key, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Citizen card - shows auto-calculated count */}
                  <div className="role-config-card good">
                    <div className="role-config-card-header">
                      <div className="role-config-card-title">
                        <span className="role-config-icon">👤</span>
                        <span className="role-config-name">Miestietis</span>
                      </div>
                      <span className="role-config-alignment good">gerieji</span>
                    </div>
                    <div className="role-config-counter">
                      <span className="counter-value" style={{ minWidth: 'auto', opacity: 0.7 }}>
                        {citizenCount} (automatiškai)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="role-config-summary">
                  <div className="role-summary-item">
                    Žaidėjai: <span>{playerCount}</span>
                  </div>
                  <div className="role-summary-item">
                    Sukonfigūruota: <span>{totalConfiguredRoles}</span> + <span>{citizenCount}</span> miestiečių
                  </div>
                  {totalConfiguredRoles > playerCount && (
                    <div className="role-summary-warning">
                      ⚠️ Vaidmenų daugiau nei žaidėjų! Dalis vaidmenų bus atsitiktinai praleista.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {isHost ? (
          <button className="btn-primary btn-large" onClick={startGame}>PRADĖTI NAKTĮ</button>
        ) : (
          <div className="waiting-text">Laukiama, kol vedėjas pradės žaidimą...</div>
        )}
      </div>
    );
  }

  // GAME VIEW
  const amIAlive = gameState?.players.find(p => p.id === myId)?.alive;
  const isNight = gameState?.state === 'NIGHT';
  const isVoting = gameState?.state === 'DAY_VOTE';
  const canTurn = (gameState?.round % 2 === 0);
  const isHost = gameState?.host === myId;
  const isGameActive = gameState?.state !== 'LOBBY' && gameState?.state !== 'GAME_OVER';
  const amIVampire = myRole?.role === 'Vampire' || myRole?.role === 'Vampire Framer';
  const currentRoleInfo = ROLE_INFO[myRole?.role] || {};
  const currentRoleAlignment = String(myRole?.alignment || currentRoleInfo.alignment || 'neutral').toLowerCase();
  const showVoicePanel = !gameState?.chatEnabled
    && gameState?.state === 'DAY_DISCUSS'
    && gameState?.enableSTT
    && sttAvailable
    && amIAlive;
  const showChatPanel = gameState?.chatEnabled && (!isNight || amIVampire);

  return (
    <div id="vampires-game-root" className="vampires-shell container game-layout">
      {selectedTheme === 'christmas' && <Snowfall />}
      <div className="game-header">
        <div className="phase-indicator">
          <span className="phase-label">{getPhaseLabel(gameState?.state)}</span>
          <span className="timer-badge">{timer} sek.</span>
        </div>
        <div className="role-display" onClick={() => setRoleRevealed(true)} title="Spustelėkite, kad pamatytumėte savo vaidmenį">
          <span className="role-label">Vaidmuo</span>
          <span className="role-value">Rodyti</span>
        </div>
        {isHost && isGameActive && (
          <div className="host-controls">
            <button className="btn-small btn-skip" onClick={skipTimer}>Praleisti laikmatį</button>
            <button className="btn-small btn-end" onClick={endGame}>Baigti žaidimą</button>
          </div>
        )}
      </div>

      {/* My Role Info Panel */}
      {roleRevealed && (
        <div className="modal-overlay" onClick={() => setRoleRevealed(false)}>
          <div
            className={`modal-content role-info-panel role-alignment-${currentRoleAlignment}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-panel-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="role-panel-heading">
              <h2 id="role-panel-title">Jūsų vaidmuo</h2>
              <div className="role-heading-ornament" aria-hidden="true">
                <span />
              </div>
            </div>
            <div className="role-emblem" aria-hidden="true">
              <span className={`role-emblem-art role-art-${currentRoleInfo.art || 'citizen'}`} />
            </div>
            <div className="role-name">{myRole?.role ? getRoleLabel(myRole.role) : '???'}</div>
            <div className="role-details">
              <div className="role-detail-row">
                <span className="role-detail-icon" aria-hidden="true"><UsersRound /></span>
                <span className="role-detail-copy">
                  <span className="detail-label">Pusė</span>
                  <span className={`detail-value alignment-${currentRoleAlignment}`}>
                    {getAlignmentLabel(currentRoleInfo.alignment || myRole?.alignment)}
                  </span>
                </span>
              </div>
              <div className="role-detail-row">
                <span className="role-detail-icon" aria-hidden="true"><Eye /></span>
                <span className="role-detail-copy">
                  <span className="detail-label">Gebėjimas</span>
                  <span className="detail-value">{currentRoleInfo.ability || 'Gebėjimas nežinomas'}</span>
                </span>
              </div>
              <div className="role-detail-row">
                <span className="role-detail-icon" aria-hidden="true"><Crosshair /></span>
                <span className="role-detail-copy">
                  <span className="detail-label">Tikslas</span>
                  <span className="detail-value">{currentRoleInfo.goal || 'Tikslas nežinomas'}</span>
                </span>
              </div>
            </div>
            <button className="role-panel-close" onClick={() => setRoleRevealed(false)}>Uždaryti</button>
          </div>
        </div>
      )}

      {amIAlive === false && <div className="banner-dead">JŪS NEBEDALYVAUJATE ŽAIDIME</div>}

      {/* Vampire voting info panel */}
      {myRole?.role === 'Vampire' && isNight && canTurn && gameState?.vampireInfo?.needsVoting && (
        <div className="vampire-voting-banner">
          🧛 Vampyrų balsavimas: {gameState.vampireInfo.totalVampires} {pluralizeLt(gameState.vampireInfo.totalVampires, 'aktyvus vampyras', 'aktyvūs vampyrai', 'aktyvių vampyrų')}.
          Daugiausia balsų gavęs taikinys bus paverstas!
        </div>
      )}

      {/* Doctor Info Banner */}
      {myRole?.role === 'Doctor' && (
        <div className="role-info-banner doctor-banner">
          💉 Jums liko <strong>{gameState?.healsRemaining ?? '?'}</strong> {typeof gameState?.healsRemaining === 'number' ? pluralizeLt(gameState.healsRemaining, 'gydymas', 'gydymai', 'gydymų') : 'gydymų'}.
        </div>
      )}

      {/* Jail Chat Modal - shows for Jailor with prisoner or jailed player */}
      {isNight && gameState?.jailInfo && (
        <div className="jail-modal">
          <div className="jail-modal-content">
            <h2>🔒 {gameState.jailInfo.isJailor ? `Apklausiamas: ${gameState.jailInfo.prisonerName}` : 'Jūs esate kalėjime!'}</h2>
            {gameState.jailInfo.isJailed && (
              <p className="jail-subtitle">Kalėjimo prižiūrėtojas nori su jumis pasikalbėti. Šią naktį negalite atlikti savo veiksmo.</p>
            )}

            <div className="jail-chat-messages" ref={jailChatMessagesRef}>
              {(jailChat.length > 0 ? jailChat : (gameState.jailInfo.jailChat || [])).map((msg, i) => (
                <div key={i} className={`jail-chat-message ${msg.sender === 'Jailor' ? 'jailor-msg' : 'prisoner-msg'}`}>
                  <span className="chat-sender">{getRoleLabel(msg.sender)}:</span>
                  <span className="chat-text">{msg.message}</span>
                </div>
              ))}
              {(jailChat.length > 0 ? jailChat : (gameState.jailInfo.jailChat || [])).length === 0 && (
                <div className="jail-chat-empty">Žinučių dar nėra. Pradėkite apklausą!</div>
              )}
            </div>

            <div className="jail-chat-input-container">
              <input
                type="text"
                className="jail-chat-input"
                placeholder="Įveskite žinutę..."
                value={jailChatInput}
                onChange={e => setJailChatInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter' && jailChatInput.trim()) {
                    socket.emit('jail_chat_message', { code: gameState.code, message: jailChatInput.trim() });
                    setJailChatInput('');
                  }
                }}
              />
              <button
                className="btn-send-message"
                onClick={() => {
                  if (jailChatInput.trim()) {
                    socket.emit('jail_chat_message', { code: gameState.code, message: jailChatInput.trim() });
                    setJailChatInput('');
                  }
                }}
              >
                Siųsti
              </button>
            </div>

            {gameState.jailInfo.isJailor && (
              <button
                className={`btn-execute ${executionPending ? 'cancel-mode' : ''}`}
                onClick={() => {
                  if (executionPending) {
                    // Cancel execution
                    socket.emit('night_action', { code: gameState.code, action: { type: 'CANCEL_EXECUTE' } });
                    // Server sends the private message, so we don't add one here
                    setExecutionPending(false);
                  } else {
                    // Execute
                    sendAction(null, 'EXECUTE');
                    setExecutionPending(true);
                  }
                }}
              >
                {executionPending ? 'Atšaukti pašalinimą' : 'Pašalinti kalinį iš žaidimo'}
              </button>
            )}
          </div>
        </div>
      )}

      {gameState?.state === 'GAME_OVER' &&
        <div className="modal-overlay">
          <div className="modal-content game-over-panel">
            <h1>ŽAIDIMAS BAIGTAS</h1>
            <h2 className={`winner-title ${gameState.winner === 'GOOD' ? 'good-win' : gameState.winner === 'EVIL' ? 'evil-win' : 'neutral-win'}`}>
              Laimėtojai: {gameState.winner === 'GOOD' ? 'Miestiečiai' : gameState.winner === 'EVIL' ? 'Vampyrai' : getAlignmentLabel(gameState.winner)}
            </h2>

            <div className="game-over-summary">
              <h3>Žaidėjų vaidmenys</h3>
              <div className="summary-grid">
                {gameState.players.map(p => (
                  <div key={p.id} className={`summary-card ${p.alignment || 'unknown'}`}>
                    <div className="summary-name">{p.name} {p.id === myId && '(jūs)'}</div>
                    <div className="summary-role">{getRoleLabel(p.role)}</div>
                    {!p.alive && <div className="summary-dead">Nedalyvauja žaidime</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="waiting-text">Laukiama, kol mokytojas grąžins visus į laukimo kambarį...</div>
          </div>
        </div>
      }

      {/* Role Info Modal for Host */}
      {selectedPlayerRole && (
        <div className="modal-overlay" onClick={() => setSelectedPlayerRole(null)}>
          <div className="modal-content role-modal" onClick={e => e.stopPropagation()}>
            <h2>{selectedPlayerRole.name}</h2>
            {selectedPlayerRole.isNPC && <span className="npc-badge">🤖 NPC</span>}
            <div className="role-info-display">
              <div className={`role-value large ${selectedPlayerRole.alignment}`}>
                {getRoleLabel(selectedPlayerRole.role)}
              </div>
              <p className="alignment-text">
                Pusė: <strong>{getAlignmentLabel(selectedPlayerRole.alignment)}</strong>
              </p>
              {/* New Status Display */}
              <p className="status-text">
                Būsena: <strong className={selectedPlayerRole.alive ? 'status-alive' : 'status-dead'}>
                  {selectedPlayerRole.alive ? 'Žaidime' : 'Nedalyvauja'}
                </strong>
              </p>
            </div>

            {/* Role Change Buttons for Host */}
            <div className="role-change-section">
              <h4>Keisti vaidmenį</h4>
              <div className="role-change-buttons">
                {['Investigator', 'Lookout', 'Doctor', 'Jailor', 'Citizen', 'Vampire', 'Vampire Framer', 'Jester'].map(role => (
                  <button
                    key={role}
                    className={`btn-role-change ${selectedPlayerRole.role === role ? 'active' : ''} ${role === 'Vampire' || role === 'Vampire Framer' ? 'evil' : role === 'Jester' ? 'neutral' : 'good'}`}
                    onClick={() => changePlayerRole(selectedPlayerRole.playerId, role)}
                    disabled={selectedPlayerRole.role === role}
                  >
                    {role === 'Investigator' && '🔍 '}
                    {role === 'Lookout' && '👁️ '}
                    {role === 'Doctor' && '💉 '}
                    {role === 'Jailor' && '🔒 '}
                    {role === 'Citizen' && '👤 '}
                    {role === 'Vampire' && '🧛 '}
                    {role === 'Vampire Framer' && '🎭 '}
                    {role === 'Jester' && '🃏 '}
                    {getRoleLabel(role)}
                  </button>
                ))}
              </div>
            </div>

            {/* Kill/Revive Buttons for Host */}
            <div className="role-change-section" style={{ marginTop: '1rem' }}>
              <h4>Dalyvavimo būsena</h4>
              <div className="role-change-buttons">
                <button
                  className="btn-role-change bad"
                  style={{ background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }}
                  onClick={() => changePlayerAliveStatus(selectedPlayerRole.playerId, false)}
                  disabled={!selectedPlayerRole.alive}
                >
                  Pašalinti iš žaidimo
                </button>
                <button
                  className="btn-role-change good"
                  style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                  onClick={() => changePlayerAliveStatus(selectedPlayerRole.playerId, true)}
                  disabled={selectedPlayerRole.alive}
                >
                  Grąžinti į žaidimą
                </button>
              </div>
            </div>

            <button className="btn-secondary" onClick={() => setSelectedPlayerRole(null)}>Uždaryti</button>
          </div>
        </div>
      )}

      <section className={`panel logs-panel ${logsExpanded ? '' : 'collapsed'}`}>
        <button
          type="button"
          className="logs-panel-heading"
          aria-expanded={logsExpanded}
          onClick={() => setLogsExpanded(current => !current)}
        >
          <span>Žaidimo įvykiai</span>
          <ChevronUp aria-hidden="true" />
        </button>
        {logsExpanded && (
          <div className="scroll-box game-log-list">
            {gameLogEntries.length ? gameLogEntries.slice().reverse().map(entry => (
              <div key={entry.id} className={`log-entry ${entry.type}`}>
                <time>{entry.time}</time>
                <span>{translateGameLogMessage(entry.message)}</span>
              </div>
            )) : (
              <div className="logs-empty">Žaidimo įvykių dar nėra.</div>
            )}
          </div>
        )}
      </section>

      <div className={`game-board ${!showVoicePanel && !showChatPanel ? 'players-only' : ''}`}>
        <div className="players-section">
          {gameState?.players.map((p, index) => (
            <div key={p.id} className={`game-player-card ${isVoting ? 'voting' : ''} ${!p.alive ? 'dead' : ''} ${p.id === myId ? 'me' : ''} ${p.isNPC ? 'npc-card' : ''} ${nightTarget?.targetId === p.id && isNight ? 'target-night' : ''} ${p.isVampire && (myRole?.role === 'Vampire' || myRole?.role === 'Vampire Framer') ? 'vampire-teammate' : ''}`}>
              {/* Vampire teammate indicator - always visible to vampires */}
              {p.isVampire && (myRole?.role === 'Vampire' || myRole?.role === 'Vampire Framer') && p.id !== myId && (
                <div className="vampire-badge">{p.vampireRole === 'Vampire Framer' ? '🎭 Klastotojas' : '🧛 Vampyras'}</div>
              )}
              {/* Target indicator badges */}
              {nightTarget?.targetId === p.id && isNight && nightTarget.type !== 'BITE' && (
                <div className="target-badge night-target-badge">
                  {nightTarget.type === 'INVESTIGATE' && '🔍 Tikrinamas'}
                  {nightTarget.type === 'LOOKOUT' && '👁️ Stebimas'}
                  {nightTarget.type === 'HEAL' && '💉 Gydomas'}
                  {nightTarget.type === 'JAIL' && '🔒 Kalinamas'}
                </div>
              )}

              <span className="player-number">{index + 1}</span>
              <div className="card-top">
                <span
                  className={`name ${isHost ? 'clickable-name' : ''}`}
                  onClick={() => isHost && viewPlayerRole(p.id)}
                  title={isHost ? 'Spustelėkite, kad peržiūrėtumėte vaidmenį' : ''}
                >
                  {p.isNPC && '🤖 '}{p.name}
                </span>
                {/* Show vote count even if I can't vote */}
                {(!amIAlive || !isVoting) && p.votes > 0 && <span className="vote-count">{p.votes} {pluralizeLt(p.votes, 'balsas', 'balsai', 'balsų')}</span>}
              </div>

              {p.alive && isVoting && amIAlive && p.id !== myId && (
                <div className="vote-action">
                  <button className={`btn-vote ${voteTarget === p.id ? 'voted' : ''}`} onClick={() => vote(p.id)}>
                    Balsuoti ({p.votes})
                  </button>
                </div>
              )}

              {p.alive && isNight && amIAlive && (p.id !== myId || myRole?.role === 'Doctor') && (
                <div className="action-buttons">
                  {myRole?.role === 'Investigator' && (
                    <button className={`btn-action ${nightTarget?.targetId === p.id ? 'action-selected' : ''}`} onClick={() => sendAction(p.id, 'INVESTIGATE')}>
                      {nightTarget?.targetId === p.id ? '✓ Tiriamas' : 'Tirti'}
                    </button>
                  )}
                  {myRole?.role === 'Lookout' && (
                    <button className={`btn-action ${nightTarget?.targetId === p.id ? 'action-selected' : ''}`} onClick={() => sendAction(p.id, 'LOOKOUT')}>
                      {nightTarget?.targetId === p.id ? '✓ Stebimas' : 'Stebėti'}
                    </button>
                  )}
                  {myRole?.role === 'Vampire' && canTurn && !p.isVampire && (
                    <button className={`btn-action btn-danger ${nightTarget?.targetId === p.id ? 'action-selected' : ''}`} onClick={() => sendAction(p.id, 'BITE')}>
                      {nightTarget?.targetId === p.id ? '✓ Balsuota' : 'Balsuoti už pavertimą'} {p.vampireVotes > 0 ? `(${p.vampireVotes})` : ''}
                    </button>
                  )}
                  {myRole?.role === 'Doctor' && (gameState?.healsRemaining > 0 || nightTarget?.type === 'HEAL') && (
                    <button className={`btn-action btn-good ${nightTarget?.targetId === p.id ? 'action-selected' : ''}`} onClick={() => sendAction(p.id, 'HEAL')}>
                      {nightTarget?.targetId === p.id ? '✓ Gydomas' : 'Gydyti'}
                    </button>
                  )}
                  {myRole?.role === 'Jailor' && p.id !== myId && !gameState?.jailInfo?.isJailor && (
                    <button className={`btn-action btn-jail ${nightTarget?.targetId === p.id ? 'action-selected' : ''}`} onClick={() => sendAction(p.id, 'JAIL')}>
                      {nightTarget?.targetId === p.id ? '✓ Kalinamas' : '🔒 Įkalinti'}
                    </button>
                  )}
                  {myRole?.role === 'Vampire Framer' && !p.isVampire && (
                    <>
                      <button className={`btn-action btn-frame ${frameTarget === p.id ? 'action-selected' : ''}`} onClick={() => sendAction(p.id, 'FRAME')}>
                        {frameTarget === p.id ? '✓ Duomenys klastojami' : '🎭 Suklastoti duomenis'}
                      </button>
                      {canTurn && (
                        <button className={`btn-action btn-danger ${nightTarget?.targetId === p.id && nightTarget?.type === 'BITE' ? 'action-selected' : ''}`} onClick={() => sendAction(p.id, 'BITE')}>
                          {nightTarget?.targetId === p.id && nightTarget?.type === 'BITE' ? '✓ Balsuota' : 'Balsuoti už pavertimą'} {p.vampireVotes > 0 ? `(${p.vampireVotes})` : ''}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar">
          {/* Voice-Only Panel - shows when chat is disabled but voice is enabled */}
          {showVoicePanel && (() => {
            const myPlayer = gameState?.players.find(p => p.id === myId);
            if (!myPlayer?.alive) return null;

            return (
              <div className="panel voice-only-panel">
                <h4>🎤 Balso pokalbis</h4>
                {gameState.voiceInputMode === 'voice-activity' ? (
                  <div className="voice-vad-container">
                    <div className="vad-status-indicator">
                      <div className="vad-status-text">
                        {isRecording ? '🔴 Kalbama...' : '🎤 Klausomasi...'}
                      </div>
                      <div className="audio-level-bar">
                        <div className="audio-level-fill" style={{ width: `${audioLevel}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className={`voice-btn ${isRecording ? 'recording' : ''}`}
                    onMouseDown={startVoiceRecording}
                    onMouseUp={stopVoiceRecording}
                    onMouseLeave={() => isRecording && stopVoiceRecording()}
                    onTouchStart={startVoiceRecording}
                    onTouchEnd={stopVoiceRecording}
                    title="Laikykite nuspaudę ir kalbėkite"
                  >
                    {isRecording ? '🔴 Įrašoma...' : '🎤 Laikykite ir kalbėkite'}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Chat Panel - only show if chat is enabled and (day phase OR vampire at night) */}
          {showChatPanel && (() => {
            const isNight = gameState?.state === 'NIGHT';
            const isDayPhase = gameState?.state === 'DAY_DISCUSS' || gameState?.state === 'DAY_VOTE';
            const myPlayer = gameState?.players.find(p => p.id === myId);
            const amIVampire = myRole?.role === 'Vampire' || myRole?.role === 'Vampire Framer';
            const canChat = myPlayer?.alive && (isDayPhase || (isNight && amIVampire));

            return (
              <div className={`panel chat-panel ${isNight ? 'vampire-chat' : ''}`}>
                <h4>{isNight ? '🧛 Vampyrų pokalbis' : '💬 Pokalbis'}</h4>
                <div className="chat-messages" ref={chatMessagesRef}>
                  {gameChat.length > 0 ? (
                    gameChat.map((msg, i) => (
                      <div key={i} className={`chat-message ${msg.senderId === myId ? 'own-message' : ''}`}>
                        <span className="chat-sender">{msg.senderName}:</span>
                        <span className="chat-text">{msg.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="chat-empty">Žinučių dar nėra...</div>
                  )}
                </div>
                {canChat ? (
                  <div className="chat-input-container">
                    <input
                      type="text"
                      className="chat-input"
                      placeholder={isNight ? 'Rašykite kitiems vampyrams...' : 'Įveskite žinutę...'}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter' && chatInput.trim()) {
                          socket.emit('chat_message', { code: gameState.code, message: chatInput.trim() });
                          setChatInput('');
                        }
                      }}
                    />
                    <button
                      className="btn-send"
                      onClick={() => {
                        if (chatInput.trim()) {
                          socket.emit('chat_message', { code: gameState.code, message: chatInput.trim() });
                          setChatInput('');
                        }
                      }}
                    >
                      Siųsti
                    </button>
                  </div>
                ) : !myPlayer?.alive ? (
                  <div className="chat-disabled">Žaidime nebedalyvaujantys žaidėjai negali rašyti</div>
                ) : null}

                {/* Voice input button - only during DAY_DISCUSS phase */}
                {gameState.state === 'DAY_DISCUSS' && myPlayer?.alive && gameState.enableSTT && sttAvailable && (
                  gameState.voiceInputMode === 'voice-activity' ? (
                    <div className="voice-vad-container">
                      <div className="vad-status-indicator">
                        <div className="vad-status-text">
                          {isRecording ? '🔴 Kalbama...' : '🎤 Klausomasi...'}
                        </div>
                        <div className="audio-level-bar">
                          <div className="audio-level-fill" style={{ width: `${audioLevel}%` }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      className={`voice-btn ${isRecording ? 'recording' : ''}`}
                      onMouseDown={startVoiceRecording}
                      onMouseUp={stopVoiceRecording}
                      onMouseLeave={() => isRecording && stopVoiceRecording()}
                      onTouchStart={startVoiceRecording}
                      onTouchEnd={stopVoiceRecording}
                      title="Laikykite nuspaudę ir kalbėkite"
                    >
                      {isRecording ? '🔴 Įrašoma...' : '🎤 Laikykite ir kalbėkite'}
                    </button>
                  )
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
