# nodester JWT boilerplate project

## Intallation

1) Run `bootstrap` command:
```sh
npm run bootstrap
```

2) **Set your environment:** Go to the new `.env` file in your project root directory and set all the neccessary variables.

3) Check if everything is working:
```sh
npm run dev
```

Should show you:
```sh
✅ Database connected
✅ [Auth] JWT keys configured
✅ Routes configured
listening on port 8080
```

4) Create your project structure by generating models, facades, controllers:

- `model`:
```sh
npm run tools:generate model <Model Name/>
```

- `controller`:
```sh
npm run tools:generate controller <Controller Name/>
```

- `facade`:
```sh
npm run tools:generate facade <Facade Name/>
```

- `filter`:
```sh
npm run tools:generate filter <Filter Name/>
```

- `provider`:
```sh
npm run tools:generate provider <Provider Name/>
```

5) Run database migration:
```sh
npm run db:migrate
```

## License
[MIT](LICENSE)

## Copyright
Copyright 2025-present [Mark Khramko](https://github.com/MarkKhramko)
