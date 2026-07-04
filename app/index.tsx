import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SHIP_WIDTH = 60;
const SHIP_HEIGHT = 70;
const SHIP_BOTTOM_OFFSET = 120;
const STEP = 30;

const ASTEROID_SIZE = 42;
const DEFAULT_SPEED = 200;

export default function GameScreen() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [shipX, setShipX] = useState((SCREEN_WIDTH - SHIP_WIDTH) / 2);
  const [asteroidX, setAsteroidX] = useState(Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE));
  const [asteroidY, setAsteroidY] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const animationFrameId = useRef(null);
  const lastTimestamp = useRef(null);
  const speedRef = useRef(DEFAULT_SPEED);

  const scoreRef = useRef(0);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shipTop = SCREEN_HEIGHT - SHIP_BOTTOM_OFFSET - SHIP_HEIGHT;

  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedScore = await AsyncStorage.getItem('highScore');
        if (savedScore !== null) {
          setHighScore(parseInt(savedScore, 10));
        }
      } catch (error) {
        console.log('Failed to load high score:', error);
      }
    };
    loadHighScore();
  }, []);

  const moveLeft = () => {
    setShipX((prevX) => Math.max(0, prevX - STEP));
  };

  const moveRight = () => {
    setShipX((prevX) => Math.min(SCREEN_WIDTH - SHIP_WIDTH, prevX + STEP));
  };

  const checkAndSaveHighScore = async (finalScoreValue) => {
    try {
      if (finalScoreValue > highScore) {
        setHighScore(finalScoreValue);
        await AsyncStorage.setItem('highScore', finalScoreValue.toString());
      }
    } catch (error) {
      console.log('Failed to save high score:', error);
    }
  };

  const checkCollision = (asteroidXPos, asteroidYPos, shipXPos) => {
    const asteroidLeft = asteroidXPos;
    const asteroidRight = asteroidXPos + ASTEROID_SIZE;
    const asteroidTop = asteroidYPos;
    const asteroidBottom = asteroidYPos + ASTEROID_SIZE;

    const shipLeft = shipXPos;
    const shipRight = shipXPos + SHIP_WIDTH;
    const shipTopEdge = shipTop;
    const shipBottomEdge = shipTop + SHIP_HEIGHT;

    const horizontalOverlap = asteroidLeft < shipRight && asteroidRight > shipLeft;
    const verticalOverlap = asteroidTop < shipBottomEdge && asteroidBottom > shipTopEdge;

    return horizontalOverlap && verticalOverlap;
  };

  const gameLoop = useCallback((timestamp) => {
    if (lastTimestamp.current == null) {
      lastTimestamp.current = timestamp;
    }
    const deltaSeconds = (timestamp - lastTimestamp.current) / 1000;
    lastTimestamp.current = timestamp;

    setAsteroidY((prevY) => {
      let newY = prevY + speedRef.current * deltaSeconds;
      let newX = asteroidX;

      if (newY > SCREEN_HEIGHT) {
        newY = 0;
        newX = Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE);
        speedRef.current = 150 + Math.random() * 150;
        setAsteroidX(newX);
        setScore((prevScore) => prevScore + 1);
      }

      if (checkCollision(newX, newY, shipX)) {
        const currentScore = scoreRef.current;
        setFinalScore(currentScore);
        setIsGameOver(true);
        setIsPlaying(false);
        checkAndSaveHighScore(currentScore);
      }

      return newY;
    });

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [asteroidX, shipX, highScore]);

  useEffect(() => {
    if (isPlaying && !isGameOver) {
      lastTimestamp.current = null;
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, isGameOver, gameLoop]);

  const handleStartGame = () => {
    setScore(0);
    setAsteroidY(0);
    setAsteroidX(Math.random() * (SCREEN_WIDTH - ASTEROID_SIZE));
    setShipX((SCREEN_WIDTH - SHIP_WIDTH) / 2);
    speedRef.current = DEFAULT_SPEED;
    setIsGameOver(false);
    setIsPlaying(true);
  };

  return (
    <LinearGradient colors={['#0B0E1A', '#1A1440', '#0B0E1A']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Space Escape Runner</Text>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Current Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
          <Text style={styles.highScoreText}>High Score: {highScore}</Text>
        </View>

        <TouchableOpacity style={styles.startButton} onPress={handleStartGame} activeOpacity={0.8}>
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>

        {isPlaying && !isGameOver && (
          <Animated.View
            style={[
              styles.asteroid,
              { left: asteroidX, top: asteroidY, transform: [{ rotate: spin }] },
            ]}
          >
            <View style={styles.asteroidCrater1} />
            <View style={styles.asteroidCrater2} />
          </Animated.View>
        )}

        <View style={[styles.spaceship, { left: shipX }]}>
          <View style={styles.shipNose} />
          <View style={styles.shipBody}>
            <View style={styles.shipWindow} />
          </View>
          <View style={styles.shipWingLeft} />
          <View style={styles.shipWingRight} />
          <View style={styles.shipFlame} />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={moveLeft} activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={moveRight} activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverText}>Game Over</Text>
            <Text style={styles.finalScoreText}>Final Score: {finalScore}</Text>
            <Text style={styles.finalHighScoreText}>High Score: {highScore}</Text>
            <TouchableOpacity style={styles.restartButton} onPress={handleStartGame} activeOpacity={0.8}>
              <Text style={styles.startButtonText}>Restart Game</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(108, 92, 231, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  scoreBox: {
    backgroundColor: 'rgba(26, 31, 51, 0.85)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 36,
    marginTop: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.4)',
  },
  scoreLabel: { fontSize: 14, color: '#8A8FA3', textTransform: 'uppercase', letterSpacing: 1 },
  scoreValue: { fontSize: 42, fontWeight: '700', color: '#4ADE80' },
  highScoreText: { fontSize: 14, color: '#FFD166', marginTop: 6, fontWeight: '600' },
  startButton: {
    marginTop: 30,
    backgroundColor: '#6C5CE7',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  asteroid: {
    position: 'absolute',
    width: ASTEROID_SIZE,
    height: ASTEROID_SIZE,
    borderRadius: ASTEROID_SIZE / 2,
    backgroundColor: '#8B6A4F',
    borderWidth: 2,
    borderColor: '#5C4530',
    justifyContent: 'center',
    alignItems: 'center',
  },
  asteroidCrater1: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#5C4530', top: 8, left: 10,
  },
  asteroidCrater2: {
    position: 'absolute', width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#5C4530', bottom: 9, right: 8,
  },
  spaceship: { position: 'absolute', bottom: SHIP_BOTTOM_OFFSET, width: SHIP_WIDTH, alignItems: 'center' },
  shipNose: {
    width: 0, height: 0,
    borderLeftWidth: 15, borderRightWidth: 15, borderBottomWidth: 22,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#A78BFA',
  },
  shipBody: {
    width: 40, height: 32, backgroundColor: '#8E7CFF', borderRadius: 10,
    marginTop: -2, alignItems: 'center', justifyContent: 'center',
  },
  shipWindow: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#DCEEFF',
    borderWidth: 2, borderColor: '#5FA8FF',
  },
  shipWingLeft: {
    position: 'absolute', width: 18, height: 10, backgroundColor: '#6C5CE7',
    borderTopLeftRadius: 6, borderBottomLeftRadius: 2, top: 40, left: -10,
  },
  shipWingRight: {
    position: 'absolute', width: 18, height: 10, backgroundColor: '#6C5CE7',
    borderTopRightRadius: 6, borderBottomRightRadius: 2, top: 40, right: -10,
  },
  shipFlame: {
    width: 16, height: 18, backgroundColor: '#FF7A45',
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10, marginTop: -2,
  },
  controls: {
    position: 'absolute', bottom: 40, flexDirection: 'row',
    justifyContent: 'space-between', width: '70%',
  },
  controlButton: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1.5, borderColor: '#4ADE80',
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  controlButtonText: { color: '#4ADE80', fontSize: 26, fontWeight: '700' },
  gameOverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11, 14, 26, 0.94)', alignItems: 'center', justifyContent: 'center',
  },
  gameOverText: { fontSize: 40, fontWeight: 'bold', color: '#FF5C5C', marginBottom: 16 },
  finalScoreText: { fontSize: 22, color: '#FFFFFF', marginBottom: 6 },
  finalHighScoreText: { fontSize: 16, color: '#FFD166', marginBottom: 24 },
  restartButton: {
    backgroundColor: '#6C5CE7', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30,
  },
});