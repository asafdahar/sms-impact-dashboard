# SMS impact dashboard

An editable dashboard showing what SMS is worth to a home-care agency: revenue recovered, shifts filled by text,
reply time, cost per shift, a value-vs-cost trend and a before/after table. All figures are **sample data**.

- **Scenarios and period:** Cautious / Expected / Stretch, monthly or annual.
- **Assumptions:** sliders drive every card and chart (`DEFAULTS` and `FIELD_GROUPS` in `src/SmsImpactDashboard.jsx`).
- **Customize:** drag, resize, add and remove cards, and edit any text in place. Edits are not saved on reload.

## Run it

```bash
npm install
npm run dev
```

Everything lives in `src/SmsImpactDashboard.jsx` (tokens, model, widgets and CSS). Built with React, Recharts and
Lucide icons; fonts (Inter, Source Serif 4) load from Google Fonts.

## License

MIT
