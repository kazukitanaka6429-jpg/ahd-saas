# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img "Yorisol" [ref=e7]
      - generic [ref=e8]: メールアドレスとパスワードを入力してください
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: メールアドレス
          - textbox "メールアドレス" [ref=e13]:
            - /placeholder: admin@example.com
        - generic [ref=e14]:
          - generic [ref=e15]: パスワード
          - textbox "パスワード" [ref=e16]
      - button "ログイン" [ref=e18]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e24] [cursor=pointer]:
    - img [ref=e25]
  - alert [ref=e28]
```