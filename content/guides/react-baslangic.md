<!-- title: React Başlangıç Rehberi -->
<!-- date: 2026-04-03 -->
<!-- category: guides -->

# React Başlangıç Rehberi

React, kullanıcı arayüzü oluşturmak için bir JavaScript kütüphanesidir. Bu rehber yeni başlayanlar için temel kavramları açıklamaktadır.

## React Nedir?

React, Facebook tarafından geliştirilen ve açık kaynak olan bir JavaScript kütüphanesidir. Bileşen tabanlı bir mimari kullanarak dinamik web uygulamaları oluşturmayı kolaylaştırır.

## Kurulum

```bash
npx create-react-app my-app
cd my-app
npm start
```

Yukarıdaki komutlar yeni bir React projesi oluşturur ve geliştirme sunucusunu başlatır.

## Temel Kavramlar

### JSX

JSX, JavaScript içinde HTML yazmanıza olanak tanır:

```jsx
const element = <h1>Merhaba Dünya!</h1>;
```

### Bileşenler (Components)

Bileşenler React'in yapı taşlarıdır. Fonksiyonel bileşen örneği:

```jsx
function Welcome(props) {
  return <h1>Merhaba, {props.name}!</h1>;
}
```

### State ve Props

Props, bileşenlere veri geçirmek için kullanılır. State ise bileşenin içinde değişen verileri tutmak için kullanılır.

## Kaynaklar

- [React Resmi Dokümantasyonu](https://react.dev)
- [React Türkçe Topluluk](https://turkishreact.dev)

Bu rehber temel bilgileri kapsamaktadır. Daha ileri konular için resmi dokümantasyonu ziyaret etmeyi önerilmektedir.
