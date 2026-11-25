//Sarina_Thapa_115518
import { useState, useEffect, useCallback } from 'react'
import './App.css'

const WORD_LENGTH = 5
const MAX_GUESSES = 6

const WORDS = [
  'APPLE', 'BRAIN', 'CHAIR', 'DREAM', 'EARTH', 'FLAME', 'GRAPE', 'HOUSE',
  'IMAGE', 'JUICE', 'KNIFE', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PIANO',
  'QUEEN', 'RIVER', 'SMILE', 'TIGER', 'UNCLE', 'VOICE', 'WATER', 'YOUTH',
  'ZEBRA', 'CLOUD', 'STONE', 'LIGHT', 'PLANT', 'BREAD', 'SHARP', 'TRAIN',
  'MOUSE', 'SWEET', 'GHOST', 'CRANE', 'BLOOM', 'FROST', 'PRIZE', 'WORLD',
]

const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)]

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

// ---------- Game logic ----------

// Returns 'correct' | 'present' | 'absent' for each letter (handles duplicates)
function evaluateGuess(guess, solution) {
  const result = Array(guess.length).fill('absent')
  const remaining = {}

  // Pass 1: exact matches; count unmatched solution letters
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === solution[i]) {
      result[i] = 'correct'
    } else {
      remaining[solution[i]] = (remaining[solution[i]] || 0) + 1
    }
  }

  // Pass 2: right letter, wrong slot
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue
    if (remaining[guess[i]] > 0) {
      result[i] = 'present'
      remaining[guess[i]]--
    }
  }
  return result
}

const RANK = { absent: 1, present: 2, correct: 3 }

// { A: 'correct', B: 'absent', ... } used to color the on-screen keyboard
function getKeyStatuses(pastGuesses, solution) {
  const statuses = {}
  pastGuesses.forEach((guess) => {
    const result = evaluateGuess(guess, solution)
    guess.split('').forEach((letter, i) => {
      const current = statuses[letter]
      if (!current || RANK[result[i]] > RANK[current]) {
        statuses[letter] = result[i]
      }
    })
  })
  return statuses
}
// ---------- Components ----------

function Tile({ letter = '', status = '' }) {
  const classes = ['tile']
  if (status) classes.push(status)
  else if (letter) classes.push('filled')
  return <div className={classes.join(' ')}>{letter}</div>
}

function Row({ guess = '', solution, submitted = false }) {
  const statuses = submitted ? evaluateGuess(guess, solution) : []
  return (
    <div className="row">
      {Array.from({ length: WORD_LENGTH }, (_, i) => (
        <Tile key={i} letter={guess[i] || ''} status={statuses[i] || ''} />
      ))}
    </div>
  )
}

function GameBoard({ pastGuesses, currentGuess, solution }) {
  const rows = []
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < pastGuesses.length) {
      rows.push(<Row key={i} guess={pastGuesses[i]} solution={solution} submitted />)
    } else if (i === pastGuesses.length) {
      rows.push(<Row key={i} guess={currentGuess} solution={solution} />)
    } else {
      rows.push(<Row key={i} solution={solution} />)
    }
  }
  return <div className="board">{rows}</div>
}

function Keyboard({ keyStatuses, onKey }) {
  return (
    <div className="keyboard">
      {KEY_ROWS.map((row, r) => (
        <div className="keyboard-row" key={r}>
          {row.map((key) => {
            const wide = key.length > 1
            const status = keyStatuses[key] || ''
            return (
              <button
                key={key}
                type="button"
                className={`key ${wide ? 'wide' : ''} ${status}`}
                onClick={() => onKey(key)}
                aria-label={key === 'BACKSPACE' ? 'Backspace' : key}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function GameOverModal({ status, solution, guesses, onRestart }) {
  const won = status === 'WON'
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>{won ? 'You got it!' : 'Out of guesses'}</h2>
        {won ? (
          <p>Solved in {guesses} {guesses === 1 ? 'guess' : 'guesses'}.</p>
        ) : (
          <p>The word was <strong className="reveal">{solution}</strong>.</p>
        )}
        <button type="button" className="primary" onClick={onRestart}>
          Play again
        </button>
      </div>
    </div>
  )
}

// ---------- Main App (centralized state) ----------

export default function App() {
  const [solutionWord, setSolutionWord] = useState(getRandomWord)
  const [currentGuess, setCurrentGuess] = useState('')
  const [pastGuesses, setPastGuesses] = useState([])
  const [gameStatus, setGameStatus] = useState('IN_PROGRESS') // IN_PROGRESS | WON | LOST
  const [message, setMessage] = useState('')

  const handleKey = useCallback(
    (key) => {
      if (gameStatus !== 'IN_PROGRESS') return // halt input after game ends
      setMessage('')

      if (key === 'BACKSPACE') {
        setCurrentGuess((g) => g.slice(0, -1))
        return
      }

      if (key === 'ENTER') {
        if (currentGuess.length < WORD_LENGTH) {
          setMessage('Not enough letters')
          return
        }
        const updated = [...pastGuesses, currentGuess]
        setPastGuesses(updated)
        setCurrentGuess('')

        if (currentGuess === solutionWord) setGameStatus('WON')
        else if (updated.length >= MAX_GUESSES) setGameStatus('LOST')
        return
      }

      if (/^[A-Z]$/.test(key)) {
        setCurrentGuess((g) => (g.length < WORD_LENGTH ? g + key : g))
      }
    },
    [gameStatus, currentGuess, pastGuesses, solutionWord]
  )

  // Physical keyboard listener, removed on cleanup
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter') {
        e.preventDefault()
        document.activeElement?.blur()
        handleKey('ENTER')
      } else if (e.key === 'Backspace') {
        handleKey('BACKSPACE')
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toUpperCase())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  const restart = () => {
    setSolutionWord(getRandomWord())
    setCurrentGuess('')
    setPastGuesses([])
    setGameStatus('IN_PROGRESS')
    setMessage('')
  }

  const keyStatuses = getKeyStatuses(pastGuesses, solutionWord)

  return (
    <main className="app">
      <header>
        <h1>Wordle</h1>
        <p className="hint">Guess the five-letter word in six tries.</p>
      </header>

      <div className="toast" aria-live="polite">{message}</div>

      <GameBoard
        pastGuesses={pastGuesses}
        currentGuess={currentGuess}
        solution={solutionWord}
      />

      <Keyboard keyStatuses={keyStatuses} onKey={handleKey} />

      {gameStatus !== 'IN_PROGRESS' && (
        <GameOverModal
          status={gameStatus}
          solution={solutionWord}
          guesses={pastGuesses.length}
          onRestart={restart}
        />
      )}
    </main>
  )
}