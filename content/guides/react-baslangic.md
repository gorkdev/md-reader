<!-- title: React Getting Started Guide -->
<!-- date: 2026-04-03 -->
<!-- category: guides -->

# React Getting Started Guide

React is a JavaScript library for building user interfaces. This guide explains fundamental concepts for beginners.

## What is React?

React is an open-source JavaScript library developed by Facebook. It simplifies the creation of dynamic web applications using a component-based architecture.

## Installation

```bash
npx create-react-app my-app
cd my-app
npm start
```

The above commands create a new React project and start the development server.

## Core Concepts

### JSX

JSX allows you to write HTML within JavaScript:

```jsx
const element = <h1>Hello World!</h1>;
```

### Components

Components are the building blocks of React. Example of a functional component:

```jsx
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}
```

### State and Props

Props are used to pass data to components. State is used to hold changing data within a component.

## Resources

- [React Official Documentation](https://react.dev)
- [React Community](https://react.dev)

This guide covers fundamental information. For more advanced topics, it is recommended to visit the official documentation.
