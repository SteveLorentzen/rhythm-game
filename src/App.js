import * as React from 'react';
import './App.css';
import useSound from 'use-sound';
import clickSound from './sounds/Click.m4a';
import bopSound from './sounds/Bop.m4a';
// import chtSound from './sounds/Cht.m4a';

function AudioAnalyser({ audio, handleClap }) {
  const [audioContext, setAudioContext] = React.useState();

  React.useEffect(() => {
    setAudioContext(new (window.AudioContext || window.webkitAudioContext)());
  }, []);

  React.useEffect(() => {
    if (!audioContext) {
      return;
    }
    const analyser = audioContext.createAnalyser();
    const dataArray = new Uint8Array(512);
    const source = audioContext.createMediaStreamSource(audio);
    source.connect(analyser);
    let rafId = requestAnimationFrame(tick);
    let lastClapTime = 0;
    function tick() {
      // gets a snapshot of volume data
      analyser.getByteTimeDomainData(dataArray);
      // checks for peaks in the volume data
      const max = Math.max(...dataArray);
      // if peaks are loud enough to be claps...
      if (max > 180) {
        const clapTime = new Date().getTime();
        // I was getting two claps registered at times when I only clapped once.
        // This if check makes sure I only get one clap registered at a time
        // (It's tough to clap two claps 75ms apart on purpose)
        if (clapTime - 75 > lastClapTime) {
          handleClap();
          lastClapTime = clapTime;
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      analyser.disconnect();
      source.disconnect();
    };
  }, [audio, handleClap, audioContext]);
  return <div />;
}

function App() {
  const [click, setClick] = React.useState();
  const [flash, setFlash] = React.useState(false);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [incorrectCount, setIncorrectCount] = React.useState(0);
  const [currentClick, setCurrentClick] = React.useState();
  const [tempo, setTempo] = React.useState(1000);
  const [rhythms, setRhythms] = React.useState([
    { subdivision: 'sixteenths' },
    { subdivision: 'triplets' },
    { subdivision: 'eighths' },
    { subdivision: 'quarters' },
    { subdivision: 'sixteenths' },
    { subdivision: 'quarters' },
    { subdivision: 'sixteenths' },
    { subdivision: 'eighths' },
    { subdivision: 'quarters' },
  ]);
  const [audio, setAudio] = React.useState(null);
  const notesRef = React.useRef(0);
  const totalNotesRef = React.useRef(0);

  const [playClick] = useSound(clickSound);
  const [playBop] = useSound(bopSound);

  async function getMicrophone() {
    const audio = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    setAudio(audio);
  }

  function stopMicrophone() {
    if (audio) {
      audio.getTracks().forEach((track) => track.stop());
    }
    setAudio(null);
  }

  const count = React.useRef(1);

  function playRhythm(config) {
    let pace;
    let totalSubs;
    if (config.subdivision === 'sixteenths') {
      pace = tempo / 4;
      totalSubs = 4;
    } else if (config.subdivision === 'triplets') {
      pace = Math.round(tempo / 3);
      totalSubs = 3;
    } else if (config.subdivision === 'eighths') {
      pace = tempo / 2;
      totalSubs = 2;
    } else if (config.subdivision === 'quarters') {
      pace = tempo;
      totalSubs = 1;
    }
    let subdivisions = 0;
    playBop();
    count.current++;
    subdivisions++;
    setCurrentClick(new Date().getTime());
    totalNotesRef.current += 1;
    if (subdivisions >= totalSubs) return;
    const currentRhythm = setInterval(() => {
      playBop();
      setCurrentClick(new Date().getTime());
      totalNotesRef.current += 1;
      count.current += 1;
      subdivisions++;
      if (subdivisions >= totalSubs) {
        clearInterval(currentRhythm);
      }
    }, pace);
  }

  function startClick() {
    totalNotesRef.current = 0;
    notesRef.current = 0;
    getMicrophone();
    let countIn = 4;
    let index = 0;
    if (click) {
      clearTimeout(click);
    }
    const thisClick = setInterval(() => {
      if (countIn > 0) {
        playClick();
        countIn--;
      } else {
        if (index === rhythms.length - 1) {
          clearInterval(thisClick);
          setTimeout(() => {
            stopMicrophone();
          }, 1500);
          clearInterval(click);
        }
        playClick();
        playRhythm(rhythms[index]);
        index++;

        setFlash(true);
        setTimeout(() => {
          setFlash(false);
        }, 40);
      }
    }, tempo);

    setClick(thisClick);
  }

  function stopClick() {
    clearTimeout(click);
    stopMicrophone();
  }

  const handleRhythm = React.useCallback(() => {
    const clickTime = new Date().getTime() - 200;
    notesRef.current += 1;

    if (
      currentClick &&
      clickTime < currentClick + 100 &&
      clickTime > currentClick - 100 &&
      notesRef.current <= totalNotesRef.current + 1 &&
      notesRef.current >= totalNotesRef.current - 1
    ) {
      setCorrectCount((prevCount) => prevCount + 1);
    } else {
      setIncorrectCount((prevCount) => prevCount + 1);
    }
  }, [currentClick]);

  return (
    <div
      className='App'
      style={{
        backgroundColor: flash ? 'orange' : 'white',
        height: '100vh',
        paddingTop: '4rem',
      }}
    >
      <button onClick={startClick}>Start!</button>
      <button onClick={stopClick}>Stop</button>

      <div>
        <h2>Correct Count:</h2>
        <p>{correctCount}</p>
      </div>
      <div>
        <h2>Incorrect Count:</h2>
        <p>{incorrectCount}</p>
      </div>

      {audio && <p>listening...</p>}
      {audio ? <AudioAnalyser handleClap={handleRhythm} audio={audio} /> : null}
    </div>
  );
}

export default App;
