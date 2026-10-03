import { useState, useEffect } from 'react';
import './App.css';

// バックエンド API URL（既存の Cloudflare Workers API）
const API_URL = "https://quiz-app-api.xin0428.workers.dev";

// 型定義 (TypeScript)
export interface QuizItem {
  category: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface User {
  id: string;
  email: string;
}

function App() {
  // 画面状態管理: 'auth' | 'start' | 'quiz' | 'result'
  const [screen, setScreen] = useState<'auth' | 'start' | 'quiz' | 'result'>('auth');
  
  // ユーザー・問題データ管理
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allQuizData, setAllQuizData] = useState<QuizItem[]>([]);
  const [quizData, setQuizData] = useState<QuizItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);

  // アプリ起動時に public/quiz-data.json を取得
  useEffect(() => {
    async function fetchQuizData() {
      try {
        const response = await fetch('/quiz-data.json');
        if (!response.ok) throw new Error('問題データの読み込みに失敗しました');
        const data: QuizItem[] = await response.json();
        setAllQuizData(data);
      } catch (error) {
        console.error('エラー:', error);
      }
    }
    fetchQuizData();
  }, []);

  // クイズ開始処理
  const handleStartQuiz = (category: string) => {
    const filtered = category === 'all' 
      ? allQuizData 
      : allQuizData.filter(q => q.category === category);

    if (filtered.length === 0) {
      alert('該当するカテゴリの問題がありません。');
      return;
    }

    // シャッフルして最大5問抽出
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(shuffled.length, 5));

    setQuizData(selected);
    setCurrentQuestion(0);
    setScore(0);
    setScreen('quiz');
  };

  return (
    <div className="quiz-container">
      <h1>Web開発 基礎クイズ (React版)</h1>

      {/* 1. ログイン・新規登録画面 */}
      {screen === 'auth' && (
        <AuthScreen 
          apiUrl={API_URL} 
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setScreen('start');
          }} 
        />
      )}

      {/* 2. スタート画面（カテゴリ選択） */}
      {screen === 'start' && currentUser && (
        <StartScreen 
          userEmail={currentUser.email} 
          onStart={handleStartQuiz} 
        />
      )}

      {/* 3. クイズ画面 */}
      {screen === 'quiz' && quizData.length > 0 && (
        <QuizScreen 
          quizData={quizData} 
          currentQuestion={currentQuestion}
          setCurrentQuestion={setCurrentQuestion}
          setScore={setScore}
          onFinish={() => setScreen('result')}
        />
      )}

      {/* 4. 結果画面 */}
      {screen === 'result' && (
        <ResultScreen 
          score={score} 
          totalQuestions={quizData.length}
          onRestart={() => setScreen('start')} 
        />
      )}
    </div>
  );
}

// --------------------------------------------------
// 各画面コンポーネント
// --------------------------------------------------

// 1. 認証画面コンポーネント
function AuthScreen({ apiUrl, onLoginSuccess }: { apiUrl: string; onLoginSuccess: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert('登録が完了しました！ログインしてください。');
        setMessage('');
      } else {
        setMessage(data.error || '登録エラー');
      }
    } catch {
      setMessage('通信エラーが発生しました');
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user);
      } else {
        setMessage(data.error || 'ログインエラー');
      }
    } catch {
      setMessage('通信エラーが発生しました');
    }
  };

  return (
    <div id="auth-screen">
      <h2>ログイン / 新規登録</h2>
      <input 
        type="email" 
        placeholder="メールアドレス" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
      <input 
        type="password" 
        placeholder="パスワード" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
      />
      <div className="button-group">
        <button onClick={handleLogin} className="btn-primary">ログイン</button>
        <button onClick={handleRegister} className="btn-secondary">新規登録</button>
      </div>
      {message && <p style={{ color: '#ef4444', marginTop: '0.8rem', textAlign: 'center', fontSize: '0.9rem' }}>{message}</p>}
    </div>
  );
}

// 2. スタート画面コンポーネント
function StartScreen({ userEmail, onStart }: { userEmail: string; onStart: (category: string) => void }) {
  return (
    <div id="start-screen">
      <p style={{ color: '#0070f3', fontWeight: 'bold', textAlign: 'center', marginBottom: '1rem' }}>ログイン中: {userEmail}</p>
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>挑戦したいカテゴリを選択してください：</p>
      <div className="options">
        <button onClick={() => onStart('all')} className="option-btn">🌟 全ジャンルからランダム</button>
        <button onClick={() => onStart('html-css')} className="option-btn">🎨 HTML / CSS 編</button>
        <button onClick={() => onStart('js')} className="option-btn">⚡ JavaScript 編</button>
        <button onClick={() => onStart('git-infra')} className="option-btn">🛠️ Git / クラウド / API 編</button>
      </div>
    </div>
  );
}

// 3. クイズ画面コンポーネント
function QuizScreen({ quizData, currentQuestion, setCurrentQuestion, setScore, onFinish }: any) {
  const current = quizData[currentQuestion];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  // タイマー処理
  useEffect(() => {
    if (selectedIdx !== null) return;

    setTimeLeft(10);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowExplanation(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, selectedIdx]);

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    setShowExplanation(true);
    if (idx === current.answer) {
      setScore((prev: number) => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedIdx(null);
    setShowExplanation(false);
    if (currentQuestion + 1 < quizData.length) {
      setCurrentQuestion((prev: number) => prev + 1);
    } else {
      onFinish();
    }
  };

  return (
    <div id="quiz-screen">
      <div className="progress">問題 {currentQuestion + 1} / {quizData.length}</div>
      <div className="timer">残り時間: {timeLeft}秒</div>
      <div className="question">{current.question}</div>

      <div className="options">
        {current.options.map((opt: string, idx: number) => {
          let className = "option-btn";
          if (selectedIdx !== null) {
            if (idx === current.answer) className += " correct";
            if (idx === selectedIdx && idx !== current.answer) className += " wrong";
          }
          return (
            <button 
              key={idx} 
              className={className} 
              disabled={selectedIdx !== null || timeLeft === 0} 
              onClick={() => handleSelect(idx)}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}>
          {selectedIdx === null && timeLeft === 0 && "⏰ タイムオーバー！ "}
          {current.explanation}
        </div>
      )}

      {showExplanation && (
        <button onClick={handleNext} className="btn-primary" style={{ marginTop: '1.2rem' }}>
          {currentQuestion + 1 < quizData.length ? "次の問題へ" : "結果を見る"}
        </button>
      )}
    </div>
  );
}

// 4. 結果画面コンポーネント
function ResultScreen({ score, totalQuestions, onRestart }: { score: number; totalQuestions: number; onRestart: () => void }) {
  const savedHighScore = localStorage.getItem("quizHighScore") || 0;
  const isNewRecord = score > Number(savedHighScore);

  if (isNewRecord) {
    localStorage.setItem("quizHighScore", String(score));
  }

  return (
    <div id="result-screen" style={{ textAlign: 'center' }}>
      <h2>結果発表</h2>
      <p style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '1rem 0' }}>{totalQuestions}問中 {score} 問正解でした！</p>
      <p style={{ color: isNewRecord ? '#22c55e' : '#64748b', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        {isNewRecord ? `🎉 最高記録更新！ 最高スコア: ${score} / ${totalQuestions}` : `最高スコア: ${savedHighScore} / ${totalQuestions}`}
      </p>
      <button onClick={onRestart} className="btn-primary">
        もう一度挑戦する
      </button>
    </div>
  );
}

export default App;