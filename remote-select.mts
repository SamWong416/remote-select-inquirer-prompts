import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  useRef,
  isEnterKey,
  isUpKey,
  isDownKey,
  isNumberKey,
  Separator,
  type PromptConfig,
} from '@inquirer/core';
import type {} from '@inquirer/type';
import chalk from 'chalk';
import figures from 'figures';
import ansiEscapes from 'ansi-escapes';

type Choice<Value> = {
  value: Value;
  name?: string;
  description?: string;
  disabled?: boolean | string;
  type?: never;
};

type Choices<Value> = ReadonlyArray<Choice<Value> | Separator>;

type RemoteSelectConfig<Value> = PromptConfig<{
  source?: () => Promise<Choices<Value>>;
  searchText?: string
}>;

type Item<Value> = Separator | Choice<Value>;

function isSelectable<Value>(item: Item<Value>): item is Choice<Value> {
  return !Separator.isSeparator(item) && !item.disabled;
}

function renderItem<Value>({ item, active }: { item: Item<Value>; active: boolean }) {
  if (Separator.isSeparator(item)) {
    return ` ${item.separator}`;
  }

  const line = item.name || item.value;
  if (item.disabled) {
    const disabledLabel =
      typeof item.disabled === 'string' ? item.disabled : '(disabled)';
    return chalk.dim(`- ${line} ${disabledLabel}`);
  }

  const color = active ? chalk.cyan : (x: string) => x;
  const prefix = active ? figures.pointer : ` `;
  return color(`${prefix} ${line}`);
}

export default createPrompt(
  <Value extends unknown>(
    config: RemoteSelectConfig<Value>,
    done: (value: Value) => void,
  ): string => {
    let remoteChoices = useRef<Choices<Value>>([]);
    const loadingIndex = useRef(0);
    const feching = useRef(true)
    const { source } = config;
    const searchText = config.searchText || 'searching'
    const firstRender = useRef(true);
    const prefix = usePrefix();
    const [status, setStatus] = useState('searching');
    let message = chalk.bold(config.message);
    if(status == 'searching') {
      if(source) {
        source().then((vals) => {
          remoteChoices.current = vals;
          feching.current = false;
          setStatus('pending');
        }).catch(() => {
          feching.current = false;
          setStatus('pending')
        })
      }
      else {
        setStatus('pending')
      }
      setStatus('loading1')
      const loadingText = chalk.dim(`${searchText}...`)
      return `${prefix} ${message} ${loadingText}${ansiEscapes.cursorHide}`
    }
    if(status.indexOf('loading') > -1) {
      loadingIndex.current++;
      loadingIndex.current = loadingIndex.current % 3
      const _status = `loading${loadingIndex.current + 1}`;
      setTimeout(() => {
        if(feching.current) {
          setStatus(_status)
        }
      }, 500);
      const loadingText = chalk.dim(`${searchText}${(loadingIndex.current == 2 ? '...' : ( loadingIndex.current == 1 ? '..': '.'))}`)
      return `${prefix} ${message} ${loadingText}${ansiEscapes.cursorHide}`
    }
    const items = remoteChoices.current;
    const [active, setActive] = useState<number>(() => {
      const selected = items.findIndex(isSelectable);
      if (selected < 0)
        throw new Error(
          '[select prompt] No selectable choices. All choices are disabled.',
        );
      return selected;
    });

    // Safe to assume the cursor position always point to a Choice.
    const selectedChoice = items[active] as Choice<Value>;

    useKeypress((key) => {
      if (isEnterKey(key)) {
        setStatus('done');
        done(selectedChoice.value);
      } else if (isUpKey(key) || isDownKey(key)) {
        const offset = isUpKey(key) ? -1 : 1;
        let next = active;
        do {
          next = (next + offset + items.length) % items.length;
        } while (!isSelectable(items[next]!));
        setActive(next);
      } else if (isNumberKey(key)) {
        const position = Number(key.name) - 1;
        const item = items[position];
        if (item == null || !isSelectable(item)) return;
        setActive(position);
      }
    });

    if (firstRender.current) {
      firstRender.current = false;
      message += chalk.dim(' (Use arrow keys)');
    }

    const lines = items
      .map((item, index) => renderItem({ item, active: index === active }))
      .join('\n');

    if (status === 'done') {
      return `${prefix} ${message} ${chalk.cyan(
        selectedChoice.name || selectedChoice.value,
      )}`;
    }

    const choiceDescription = selectedChoice.description
      ? `\n${selectedChoice.description}`
      : ``;

    return `${prefix} ${message}\n${lines}${choiceDescription}${ansiEscapes.cursorHide}`;
  },
);

export { Separator };