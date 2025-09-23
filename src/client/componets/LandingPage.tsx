import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import coverImage from '../assets/storybook/cover.png';
import chapterImageOne from '../assets/storybook/chapter1.png';
import chapterImageTwo from '../assets/storybook/chapter2.png';
import chapterImageThree from '../assets/storybook/chapter3.png';
import chapterImageFour from '../assets/storybook/chapter4.png';

import './LandingPage.css';

const storyChapters = [
  {
    title: 'Plan playdates in minutes',
    body:
      'Set the date, pick the spot, and send invites without spreadsheets or endless texts.',
    image: chapterImageOne,
    alt: 'Parent planning a playdate with two kids happily playing together.'
  },
  {
    title: 'Discover new friends around you',
    body:
      'Match with nearby families and pups who share your vibe and availability.',
    image: chapterImageTwo,
    alt: 'Family meeting new friends at a park while kids wave to each other.'
  },
  {
    title: 'Map the perfect meetup',
    body:
      'See playgrounds, backyards, or cafés at a glance and keep everyone in sync.',
    image: chapterImageThree,
    alt: 'Illustrated map experience showing various playdate locations.'
  },
  {
    title: 'Keep the story going',
    body:
      'Capture memories, queue up the next hangout, and celebrate the wins together.',
    image: chapterImageFour,
    alt: 'Friends and kids celebrating together after a successful playdate.'
  }
];

const overviewStats = [
  { value: '2K+', label: 'Families planning weekly adventures' },
  { value: '96%', label: 'Happier scheduling with fewer back-and-forths' },
  { value: '4.8/5', label: 'Average rating from parents and caregivers' }
];

const featureHighlights = [
  {
    tag: 'Scheduling intelligence',
    title: 'Availability that aligns instantly',
    description:
      'Signal who is free, find overlaps across parents, kids, and pups, and confirm the perfect time in seconds.'
  },
  {
    tag: 'Context-rich spaces',
    title: 'Shared plans everyone understands',
    description:
      'Attach locations, allergies, toys to bring, and travel notes in one beautiful itinerary that updates live.'
  },
  {
    tag: 'Delightful follow-through',
    title: 'From first hello to future hangouts',
    description:
      'Log highlights, recommend the next meetup, and grow your network without losing the personal touch.'
  }
];

const testimonial = {
  quote:
    'PlayMate turned our chaotic group chats into a calm, shared playbook. Kids, parents, and even our retriever have more fun together.',
  name: 'Jessie Wu',
  role: 'Founder, The Neighborhood Family Co-op'
};

const LandingPage: React.FC = () => {
  const totalChapters = storyChapters.length;
  const [activeChapter, setActiveChapter] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'forward' | 'backward'>('forward');

  useEffect(() => {
    if (!isTurning) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsTurning(false);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isTurning]);

  const goToChapter = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= totalChapters || nextIndex === activeChapter) {
      return;
    }

    setTurnDirection(nextIndex > activeChapter ? 'forward' : 'backward');
    setActiveChapter(nextIndex);
    setIsTurning(true);
  };

  const goToPrevious = () => goToChapter(activeChapter - 1);
  const goToNext = () => goToChapter(activeChapter + 1);

  const handleStoryClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const midpoint = bounds.left + bounds.width / 2;
    if (event.clientX > midpoint) {
      goToNext();
    } else {
      goToPrevious();
    }
  };

  const handleStoryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNext();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPrevious();
    }
  };

  const currentChapter = storyChapters[activeChapter];
  const previousChapter = storyChapters[activeChapter - 1];
  const nextChapter = storyChapters[activeChapter + 1];

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <span className="brand-mark">PlayMate</span>
        <div className="nav-actions">
          <Link to="/login" className="nav-link">Log in</Link>
          <Link to="/login" className="cta-button">Start free</Link>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Playdates, petdates, and parent hangs without the group chat chaos.</p>
          <h1>Plan real-life fun like your favourite story</h1>
          <p className="hero-subtitle">
            PlayMate keeps your family’s social calendar charming, organized, and ready for the next adventure.
          </p>
          <ul className="hero-highlights">
            <li className="hero-highlight">Smart availability matching across families and pets</li>
            <li className="hero-highlight">Beautiful shared itineraries with live updates</li>
            <li className="hero-highlight">One tap to confirm, reschedule, or spin up the sequel</li>
          </ul>
          <div className="hero-actions">
            <Link to="/login" className="cta-button">Start your next playdate</Link>
            <a href="#story" className="ghost-button">Read the story</a>
          </div>
        </div>
        <div className="hero-illustration">
          <img src={coverImage} alt="Parents reading a storybook about the PlayMate app." />
        </div>
      </header>

      <section className="landing-overview" aria-label="PlayMate impact">
        {overviewStats.map((stat) => (
          <div className="overview-card" key={stat.label}>
            <span className="overview-value">{stat.value}</span>
            <span className="overview-label">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="landing-features" id="features">
        <div className="section-header">
          <span className="section-kicker">Why modern families rely on PlayMate</span>
          <h2>Everything you need to orchestrate real-world connection</h2>
          <p>
            Bring together parents, caregivers, and friends with a workspace that feels as thoughtful as the moments you share.
          </p>
        </div>
        <div className="feature-grid">
          {featureHighlights.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-tag">{feature.tag}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-story" id="story">
        <div className="story-header">
          <span className="story-kicker">PlayMate, chapter by chapter</span>
          <h2>Turn the page to see what a smoother playdate feels like</h2>
        </div>

        <div
          className={`storybook ${isTurning ? `is-turning ${turnDirection}` : ''}`}
          aria-live="polite"
        >
          <div
            className="storybook-inner"
            role="group"
            aria-label={`Chapter ${activeChapter + 1} of ${totalChapters}`}
            tabIndex={0}
            onClick={handleStoryClick}
            onKeyDown={handleStoryKeyDown}
          >
            <div className="story-art">
              <img src={currentChapter.image} alt={currentChapter.alt} loading="lazy" />
            </div>
            <div className="story-copy">
              <span className="chapter-number">Chapter {activeChapter + 1}</span>
              <h2>{currentChapter.title}</h2>
              <p>{currentChapter.body}</p>
            </div>
          </div>

          <div className="page-instruction" aria-hidden="true">
            Click or tap either side to flip a page · Press ← / → on keyboard
          </div>

          {previousChapter && (
            <div className="page-hint previous-hint" aria-hidden="true">
              <span>Back: {previousChapter.title}</span>
            </div>
          )}

          {nextChapter && (
            <div className="page-hint next-hint" aria-hidden="true">
              <span>Next: {nextChapter.title}</span>
            </div>
          )}
        </div>

        <div className="storybook-controls">
          <button
            type="button"
            className="turn-button"
            onClick={goToPrevious}
            disabled={activeChapter === 0}
            aria-label="Go to previous chapter"
          >
            ← Previous
          </button>

          <div className="chapter-dots" role="tablist" aria-label="Storybook chapters">
            {storyChapters.map((chapter, index) => (
              <button
                key={chapter.title}
                type="button"
                className={`chapter-dot ${index === activeChapter ? 'is-active' : ''}`}
                onClick={() => goToChapter(index)}
                aria-label={`Go to chapter ${index + 1}: ${chapter.title}`}
                aria-current={index === activeChapter ? 'step' : undefined}
              />
            ))}
          </div>

          <button
            type="button"
            className="turn-button"
            onClick={goToNext}
            disabled={activeChapter === totalChapters - 1}
            aria-label="Go to next chapter"
          >
            Next →
          </button>
        </div>

        <div className="storybook-skip">
          <Link to="/login" className="ghost-button">Skip ahead to log in or sign up</Link>
        </div>
      </section>

      <section className="landing-testimonial" aria-label="Customer story">
        <div className="testimonial-card">
          <span className="testimonial-icon" aria-hidden="true">“</span>
          <p className="testimonial-quote">{testimonial.quote}</p>
          <div className="testimonial-author">
            <span className="author-name">{testimonial.name}</span>
            <span className="author-role">{testimonial.role}</span>
          </div>
        </div>
        <div className="testimonial-footer">
          <p>Join the communities creating meaningful play with PlayMate.</p>
          <Link to="/login" className="ghost-button">Explore the dashboard preview</Link>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Because the best stories are the ones we share.</h2>
        <p>Start your next playdate today.</p>
        <Link to="/login" className="cta-button">Create your free account</Link>
      </section>
    </div>
  );
};

export default LandingPage;
