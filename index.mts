import select, { Separator } from './remote-select.mts'

const choices = [
  {
    name: 'npm',
    value: 'npm',
    description: 'npm is the most popular package manager',
  },
  {
    name: 'yarn',
    value: 'yarn',
    description: 'yarn is an awesome package manager',
  },
  new Separator(),
  {
    name: 'jspm',
    value: 'jspm',
    disabled: true,
  },
  {
    name: 'pnpm',
    value: 'pnpm',
    disabled: '(pnpm is not available)',
  },
]

const getSources = () => {
  return new Promise<any>((resolve) => {
    setTimeout(() => {
      resolve(choices)
    }, 5000);
  })
}

await select({
  message: 'Select a package manager',
  source: getSources,
});