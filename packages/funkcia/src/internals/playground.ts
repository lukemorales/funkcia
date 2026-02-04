import { Option } from '../option';
import { OptionAsync } from '../option-async';

const o = Option.try(() => 1);
const $o = OptionAsync.try(() => Promise.resolve(1));

const o2 = Option.fn((id: string) => Option.of(id));
const $o2 = OptionAsync.fn((id: string) => Promise.resolve(Option.of(id)));

const o3 = Option.lift((id: string) => id);
