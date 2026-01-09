# nodester boilerplate project

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
✅ Routes configured
listening on port 8080
```

4) Create your project structure by generating models, facades, controllers:

**model**:

Will create:
- Model (if does not exist)
- Facade (if does not exist)
- Controller (if does not exist)

```sh
npm run tools:generate model <Model Name/>
```


**filter**:

When you are generating a filter, provide a `Role` argument
- It will ensure a proper structure of your `/filters` directory
- For example, if a role is `admin`, all the filters will be placed in `/filters/<Model Name>/admin`

```sh
npm run tools:generate filter <Model Name/> <Role/>
```


**provider**:

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
