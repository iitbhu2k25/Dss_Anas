'use client';

import { useEffect, useState } from 'react';

const SimpleUnderConstruction = () => {
  return (
    <div style={styles.container}>
      {/* Background GIF */}
      <div style={styles.gifContainer}>
        <img
          src="/images/constructt/under_maintain.gif"
          alt="Under Maintenance"
          style={styles.gif}
        />
      </div>

      {/* Centered "UNDER CONSTRUCTION" */}
      <h1 style={styles.heading}>UNDER CONSTRUCTION</h1>

      {/* Lower Static Messages */}
      <div style={styles.messageBox}>
        <p style={styles.text}>
          We're working hard to bring this section to life. Please check back soon!
        </p>
        <p style={styles.text}>Help us keep rivers clean</p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: "'Orbitron', 'Poppins', sans-serif",
    backgroundColor: '#000',
  },
  gifContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
    overflow: 'hidden',
  },
  gif: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    transform: 'scale(1.3)',
    opacity: 0.9,
    userSelect: 'none',
    pointerEvents: 'none',
  },
  heading: {
    position: 'absolute',
    top: '45%',
    width: '100%',
    textAlign: 'center',
    fontSize: '7rem', // increased size
    fontWeight: 900,
    color: '#FFD700', // bright golden yellow
    textShadow: '2px 2px 8px rgba(255, 215, 0, 0.6)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  messageBox: {
    position: 'absolute',
    top: '70%',
    width: '100%',
    textAlign: 'center',
    zIndex: 2,
    padding: '0 20px',
    pointerEvents: 'none',
  },
  text: {
    fontSize: '2.5rem', // increased size
    color: '#FFD700',
    fontWeight: 600,
    lineHeight: 1.6,
    margin: '10px 0',
    textShadow: '1px 1px 6px rgba(0, 0, 0, 0.8)',
  },
};

export default SimpleUnderConstruction;