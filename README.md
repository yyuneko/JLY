# JLY

<!-- PROJECT SHIELDS -->

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />

<p align="center">
   <a href="https://github.com/yyuneko/JLY/">
      <img src="images/logo.svg" alt="Logo">
   </a>

   <h3 align="center">JLY(JavaScript Lex-Yacc)</h3>
   <p align="center">
A zero-dependency JavaScript implementation of parsing tools lex and yacc. It includes lexer generator, parser generator.
   </p>
</p>

## Content

- [Getting Started](#Getting-Started)
  - [Regex to FA](#Regex-to-FA)
  - [Lexer](#Lexer)
  - [Parser](#Parser)
- [Features](#Features)
- [Deployment](#Deployment)
- [Author](#Author)

### Getting Started

#### Regex to FA

Currently supports `|`, `?`, `*`, `+` and concatenation.
See [Example](src/components/Re2FA/examples_custom_language/language_define.js)

#### Lexer

See [README of Lexer](src/modules/Lexer/README.md)

#### Parser

See [README of Parser](src/modules/Parser/README.md)

### Features

1. [x] Regular expression to NFA
2. [x] NFA to DFA
3. [x] Minimize DFA
4. [x] Lexer
5. [ ] Parser
   1. [ ] LL(1)
   2. [ ] LR(0)
   3. [x] SLR(1)
   4. [ ] LR(1)
   5. [ ] LALR(1)

### Deployment

<!-- # Usage

## Re to FA

Only support "|", "?", "\*", "+" and concatenation.

## Use DFA in your project

There will be more details later.

## Lexer for your custom language

See [example](./src/components/Re2FA/examples_custom_language/language_define.js)

There will be more details later. -->

### Project setup

```
npm install
```

#### Compiles and hot-reloads for development

```
npm run serve
```

#### Compiles and minifies for production

```
npm run build
```

#### Lints and fixes files

```
npm run lint
```

#### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

### Author

Email: <a href="mailto:steubermarsha54@gmail.com">steubermarsha54@gmail.com</a>
Blog: <a href="https://blog.yuneko.xyz/">Yuneko's Blog</a>

<!-- links -->

[your-project-path]: yyuneko/JLY
[contributors-shield]: https://img.shields.io/github/contributors/yyuneko/JLY.svg?style=flat-square
[contributors-url]: https://github.com/yyuneko/JLY/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/yyuneko/JLY.svg?style=flat-square
[forks-url]: https://github.com/yyuneko/JLY/network/members
[stars-shield]: https://img.shields.io/github/stars/yyuneko/JLY.svg?style=flat-square
[stars-url]: https://github.com/yyuneko/JLY/stargazers
[issues-shield]: https://img.shields.io/github/issues/yyuneko/JLY.svg?style=flat-square
[issues-url]: https://img.shields.io/github/issues/yyuneko/JLY.svg
[license-shield]: https://img.shields.io/github/license/yyuneko/JLY.svg?style=flat-square
[license-url]: https://github.com/yyuneko/JLY/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=flat-square&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/shaojintian
