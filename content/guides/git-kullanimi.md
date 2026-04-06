<!-- title: Git Kullanım Rehberi -->
<!-- date: 2026-04-02 -->
<!-- category: guides -->

# Git Kullanım Rehberi

Git, sürüm kontrol sistemidir ve yazılım geliştirmede önemli bir rol oynar. Bu rehber temel Git komutlarını ve iş akışını açıklamaktadır.

## Git Nedir?

Git, dosyalarınızın değişikliklerini takip eden dağıtık bir sürüm kontrol sistemidir. Takım çalışmasında ve proje yönetiminde temel araçtır.

## İlk Kurulum

```bash
git config --global user.name "Adınız"
git config --global user.email "email@example.com"
```

## Temel Komutlar

### Depo Oluşturma

```bash
git init
```

### Değişiklikleri Staging Area'ya Ekleme

```bash
git add .
```

### Commit Oluşturma

```bash
git commit -m "Anlamlı bir commit mesajı"
```

### Değişiklikleri Uzak Sunucuya Gönderme

```bash
git push origin main
```

### Uzak Depodan Değişiklikleri Çekme

```bash
git pull origin main
```

## Branch İş Akışı

```bash
# Yeni branch oluşturma
git branch feature/yeni-ozellik

# Branch'e geçme
git checkout feature/yeni-ozellik

# Branch'i silme
git branch -d feature/yeni-ozellik
```

## İyi Pratikler

- Commit mesajlarını açık ve anlaşılır yazın
- Küçük, mantıklı parçalar halinde commit yapın
- Main branch'i doğrudan değiştirmeyin
- Pull request kullanarak kod review'den geçirin

Bu rehber Git kullanımının temelini kapsamaktadır.
