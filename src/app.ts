import * as React from 'react';
// First install react-nativescript package:
// npm install react-nativescript @nativescript/core
import { MainStack } from './components/MainStack';

// Since @nativescript/core is not found, we need to install it first
// Run: npm install @nativescript/core --save
// Then uncomment the following import:
// import { Application } from '@nativescript/core';

// Controls react-nativescript log verbosity.
// - true: all logs;
// - false: only error logs.
Object.defineProperty(global, '__DEV__', { value: false });

// Temporarily comment out Application.run until @nativescript/core is properly installed
/*
Application.run({
    create: () => React.createElement(MainStack, {}, null)
});
*/
