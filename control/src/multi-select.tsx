import { createRef, Fragment, h, RefObject } from 'preact';
import {
    AbstractSelect,
    DataItem,
    DEFAULT_PROPS as ABSTRACT_DEFAULT_PROPS,
    Props as SearchControllerProps,
    State as AbstractSelectState
} from './abstract-select';
import * as announce from './announce';
import { Dropdown } from './dropdown';
import { Remove, Toggle } from './icons';
import { ResultList } from './result-list';
import { style } from './style';
import { cn, extend, Key, merge, scope } from './util';

const forceImportOfH = h;

export interface Props extends SearchControllerProps {
    valuesLabel: string;
    comboboxLabel: string;
    values: DataItem[];
    maxValues?: number;
    onChange: (values: DataItem[]) => void;
}

interface ValueListState {
    active: number;
    selected: boolean[];
}

interface State extends AbstractSelectState {
    values: ValueListState;
}

const DEFAULT_PROPS = extend({}, ABSTRACT_DEFAULT_PROPS, { values: [] });

export class MultiSelect extends AbstractSelect<Props, State> {
    private containerRef: RefObject<HTMLDivElement>;
    private dropdownRef: RefObject<HTMLElement>;
    private bodyRef: RefObject<HTMLDivElement>;
    private valuesRef: RefObject<HTMLDivElement>;
    private searchRef: RefObject<HTMLInputElement>;

    public static defaultProps = DEFAULT_PROPS;

    constructor(props) {
        super(props);
        const { values } = props;

        this.valuesRef = createRef();
        this.searchRef = createRef();
        this.bodyRef = createRef();
        this.containerRef = createRef();
        this.dropdownRef = createRef();

        this.state = extend(this.state, {
            values: {
                active: -1,
                selected: values.map(v => false)
            }
        });
    }

    public componentWillMount() {
        announce.initialize();
    }

    public render(props, state) {
        const { values, tabIndex, minimumCharacters, maxValues, valuesLabel, comboboxLabel, placeholder } = props;
        const {
            open,
            loading,
            focused,
            search,
            values: { active, selected },
            results
        } = state;
        const dictionary = this.dictionary;

        const showPlaceholder = !values || values.length === 0;

        const classes = cn(
            this.props.cssClass,
            style.control,
            style.multi,
            { [style.open]: open },
            { [style.focused]: focused }
        );

        const instructionsDomId = this.namespace + '-instructions';
        const resultsDomId = this.namespace + '-results';
        const resultsNamespace = this.namespace + '-res-';

        return (
            <Fragment>
                <div
                    class={classes}
                    ref={this.containerRef}
                    onFocusCapture={this.onFocusIn}
                    onBlurCapture={this.onFocusOut}
                    tabIndex={-1}
                    onMouseDown={this.focusSearchAndStopPropagation}
                >
                    <div class={cn(style.body)} ref={this.bodyRef} onClick={this.onBodyClick}>
                        <div id={instructionsDomId} class={cn(style.offscreen)} style={{ display: 'none' }}>
                            {dictionary.multiSelectInstructions()}
                        </div>
                        {scope(() => {
                            const activeDescendant = active >= 0 ? this.namespace + '-vl-' + active : undefined;
                            if (values && values.length > 0) {
                                return (
                                    <div
                                        ref={this.valuesRef}
                                        class={cn(style.multiValues)}
                                        tabIndex={tabIndex}
                                        role='listbox'
                                        aria-orientation='vertical'
                                        aria-multiselectable='true'
                                        aria-activedescendant={activeDescendant}
                                        aria-label={valuesLabel}
                                        aria-describedby={instructionsDomId}
                                        onFocus={this.onValuesFocus}
                                        onBlur={this.onValuesBlur}
                                        onKeyDown={this.onValuesKeyDown}
                                    >
                                        {values.map((value: DataItem, index: number) => {
                                            const isSelected = selected[index];
                                            const isActive = active === index;
                                            const css = cn(style.item, {
                                                [style.selected]: isSelected,
                                                [style.active]: isActive
                                            });
                                            const id = this.namespace + '-vl-' + index;
                                            const label = this.getItemLabel(value);
                                            const render = this.renderValue(value);
                                            return (
                                                <div
                                                    id={id}
                                                    class={css}
                                                    role='option'
                                                    aria-selected={isSelected}
                                                    aria-label={label}
                                                    onMouseDown={(e: Event) => e.stopPropagation()}
                                                    onClick={this.onValueClick(index)}
                                                >
                                                    <div class={style.content}>{render}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            } else {
                                return null;
                            }
                        })}
                        {scope(() => {
                            const disabled = !selected.find(x => x === true);
                            const className = cn(style.remove, {
                                [style.offscreen]: values.length < 1
                            });
                            return (
                                <button
                                    className={className}
                                    onClick={this.onRemoveSelectedClick}
                                    onFocus={this.onRemoveSelectedFocus}
                                    disabled={disabled}
                                    aria-disabled={disabled}
                                    title={dictionary.removeButtonTitle()}
                                    aria-label={dictionary.removeButtonTitle()}
                                    type='button'
                                >
                                    <span>
                                        <Remove width={20} height={20} />
                                    </span>
                                </button>
                            );
                        })}
                        <label htmlFor={undefined} className={style.offscreen}>
                            {comboboxLabel}
                        </label>
                        <input
                            type='text'
                            ref={this.searchRef}
                            value={search}
                            class={cn(style.search)}
                            role='combobox'
                            aria-label={props.comboboxLabel}
                            aria-autocomplete='list'
                            aria-haspopup='true'
                            aria-owns={resultsDomId}
                            aria-controls={resultsDomId}
                            aria-expanded={open ? 'true' : 'false'}
                            aria-activedescendant={results.active >= 0 ? resultsNamespace + results.active : undefined}
                            aria-busy={loading}
                            onInput={this.onSearchInput}
                            onKeyDown={this.onSearchKeyDown}
                            onFocus={this.onSearchFocus}
                            placeholder={showPlaceholder ? placeholder : undefined}
                        />
                        <div
                            className={cn(style.toggle)}
                            aria-hidden={true}
                            tabIndex={-1}
                            onClick={this.onToggleClick}
                            title={dictionary.expandButtonTitle()}
                        >
                            <Toggle height={20} width={20} />
                        </div>
                    </div>
                </div>
                {open && (
                    <Dropdown
                        class={cn(this.props.cssClass, style.dropdown, style.multi)}
                        onClick={this.onDropdownClick}
                        controlRef={this.containerRef}
                        dropdownRef={this.dropdownRef}
                        parentElement={this.props.dropdownParentElement}
                    >
                        <ResultList
                            namespace={resultsNamespace}
                            maximumValues={maxValues}
                            minimumCharacters={minimumCharacters}
                            dictionary={this.dictionary}
                            itemLabel={this.getItemLabel}
                            renderItem={this.renderResult}
                            listboxDomId={resultsDomId}
                            search={search}
                            {...this.state.results}
                            loading={loading}
                            onResultClicked={this.onResultClicked}
                            onMouseMove={this.onResultMouseMove}
                            onLoadMore={this.onLoadMoreResults}
                        />
                    </Dropdown>
                )}
            </Fragment>
        );
    }

    public componentDidMount() {
        const css = this.props.containerStyle;
        if (css && css.length > 0) {
            this.containerRef.current!.setAttribute('style', css);
        }
    }

    private onLoadMoreResults = () => {
        this.loadMore();
    };

    private focusSearchAndStopPropagation = (event: Event) => {
        this.searchRef.current!.focus();
        event.preventDefault();
        event.stopPropagation();
    };

    public onToggleClick = (event: MouseEvent) => {
        const { open } = this.state;
        if (open) {
            this.close();
            this.searchRef.current!.focus();
        } else {
            this.search(this.state.search, this.props.values, { open: true });
            this.searchRef.current!.focus();
        }
        event.preventDefault();
        event.stopPropagation();
    };

    public onBodyClick = (event: MouseEvent) => {
        if (event.target === this.bodyRef.current) {
            // if the element itself was clicked, (white space inside the body)
            this.searchRef.current!.focus();
        }
    };

    public onFocusIn = (event: FocusEvent) => {
        this.updateState({ focused: true });
    };

    public onFocusOut = (event: FocusEvent) => {
        const receiver = event.relatedTarget as Node;
        const container = this.containerRef.current!;
        const dropdown = this.dropdownRef.current!;
        const focused =
            container.contains(receiver) || (dropdown && (dropdown === receiver || dropdown.contains(receiver)));

        this.updateState({
            focused
        });
        if (!focused) {
            this.closeIfOpen();
        }
    };

    public onSearchFocus = (event: FocusEvent) => {
        const { openOnFocus } = this.props;
        const { open } = this.state;
        if (!open && openOnFocus) {
            this.search(this.searchRef.current!.value, this.props.values, { open: true });
        }
    };

    public onResultMouseMove = (index: number, event: MouseEvent) => {
        this.selectSearchResult(index);
    };

    public toggleValue = (index: number) => {
        const {
            values: { selected }
        } = this.state;
        const next = selected.slice();
        next[index] = !next[index];
        this.updateState({ values: { selected: next, active: index } });
    };

    public onRemoveSelectedFocus = (event: FocusEvent) => {
        this.closeIfOpen();
    };

    public onRemoveSelectedClick = (event: Event) => {
        const {
            values: { selected }
        } = this.state;
        const { values, onChange } = this.props;
        const next = values.slice().filter((value, index) => !selected[index]);
        this.updateState({
            values: {
                selected: next.map(v => false)
            }
        });
        onChange(next);

        this.searchRef.current!.focus();
    };

    public onSearchInput = (event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        this.search(value, this.props.values, { open: true });
    };

    public onSearchKeyDown = (event: KeyboardEvent) => {
        const { open } = this.state;
        const searchBoxValue = (event.target as HTMLInputElement).value;
        const { values } = this.props;

        if (
            searchBoxValue === '' && //
            (event.key === Key.Backspace || event.key === Key.Delete) && //
            values.length > 0
        ) {
            this.setState(
                (prevState: State) => {
                    const state = extend({}, prevState);
                    this.applyCloseState(state);
                    state.values.active = values.length - 1;
                    return state;
                },
                () => {
                    if (this.valuesRef.current) {
                        this.valuesRef.current.focus();
                    }
                }
            );
        }

        if (open) {
            if (this.handleResultNavigationKeyDown(event)) {
                return;
            }
            if (event.key === Key.Escape) {
                if (open) {
                    this.close();
                }
                event.preventDefault();
            } else if (this.hasSearchResults()) {
                switch (event.key) {
                    case Key.Enter:
                        this.onActiveResultSelectedViaKeypress(event);
                        break;
                }
            } else {
                // when there are no search results ignore enter
                switch (event.key) {
                    case Key.Enter:
                        event.preventDefault();
                        break;
                }
            }
        } else {
            switch (event.key) {
                case Key.ArrowDown:
                case Key.Down:
                case Key.Enter:
                    this.search('', this.props.values, { open: true });
                    break;
            }
        }
    };

    public onValueClick = (index: number) => (event: MouseEvent) => {
        this.toggleValue(index);
        event.preventDefault();
        event.stopPropagation();
    };

    public onValuesFocus = (event: Event) => {
        const {
            values: { active, selected }
        } = this.state;
        const { values } = this.props;

        // highlight the first selected value
        if (active < 0 && values.length > 0) {
            let index = 0;
            for (let i = 0; i < selected.length; i++) {
                if (selected[i]) {
                    index = i;
                    break;
                }
            }
            this.updateState({ values: { active: index } });
        }
        this.closeIfOpen();
    };

    public closeIfOpen() {
        if (this.state.open) {
            this.close();
        }
    }

    public close = (callback?: () => void) => {
        this.setState(state => {
            this.applyCloseState(state);
            return state;
        }, callback);
    };

    private applyCloseState(state: State) {
        merge(state, [
            {
                open: false,
                results: { results: undefined },
                search: ''
            }
        ]);
    }

    public onValuesBlur = (event: Event) => {
        this.updateState({ values: { active: -1 } });
    };

    public onValuesKeyDown = (event: KeyboardEvent) => {
        const active = this.state.values.active;
        const { values } = this.props;

        switch (event.key) {
            case Key.ArrowLeft:
            case Key.ArrowUp:
            case Key.Up:
            case Key.Left: {
                if (active > 0) {
                    this.updateState({ values: { active: active - 1 } });
                }
                event.preventDefault();
                break;
            }
            case Key.ArrowRight:
            case Key.Right:
            case Key.ArrowDown:
            case Key.Down: {
                if (active < values.length - 1) {
                    this.updateState({ values: { active: active + 1 } });
                }
                event.preventDefault();
                break;
            }
            case Key.PageDown: {
                // TODO
                event.preventDefault();
                break;
            }
            case Key.PageUp: {
                // TODO
                event.preventDefault();
                break;
            }
            case Key.Home: {
                this.updateState({ values: { active: 0 } });
                event.preventDefault();
                break;
            }
            case Key.End: {
                this.updateState({ values: { active: values.length - 1 } });
                event.preventDefault();
                break;
            }
            case Key.Space:
            case Key.Spacebar: {
                this.toggleValue(active);
                event.preventDefault();
                break;
            }
            case Key.Backspace:
            case Key.Delete:
                this.removeActiveChoice();
        }
    };

    private removeActiveChoice() {
        const { values, onChange } = this.props;
        const { selected, active } = this.state.values;
        if (values.length > 0 && active >= 0) {
            const nextValues = [...values];
            nextValues.splice(active, 1);
            const nextSelected = [...selected];
            nextSelected.splice(active, 1);
            let nextActive = active - 1;
            if (nextSelected.length > 0) {
                nextActive = Math.max(0, nextActive); // if there are items still available select the first
            }
            this.updateState(
                {
                    values: {
                        active: nextActive,
                        selected: nextSelected
                    }
                },
                () => {
                    if (nextValues.length === 0) {
                        if (this.searchRef.current != null) {
                            this.searchRef.current.focus();
                        }
                    }
                    onChange(nextValues);
                }
            );
        }
    }

    public onDropdownClick = (event: MouseEvent) => {
        // result clicks do not make it this far because they do not propagate
        // so this click is on something other than result
        event.preventDefault();
        event.stopPropagation();
        this.searchRef.current!.focus();
    };

    public onResultClicked = (result: any, event: MouseEvent) => {
        const { openOnFocus } = this.props;
        const values = this.selectResult(result);

        const focusSearchLater = () => {
            window.setTimeout(() => {
                this.searchRef.current!.focus();
            }, 0);
        };

        if (openOnFocus) {
            this.search('', values, {}, focusSearchLater);
        } else {
            this.close(focusSearchLater);
        }

        event.preventDefault();
        event.stopPropagation();
    };

    public onActiveResultSelectedViaKeypress = (event: KeyboardEvent) => {
        const { openOnFocus } = this.props;
        const result = this.getSelectedSearchResult();
        const values = this.selectResult(result);
        if (openOnFocus) {
            this.search('', values, { open: true });
        } else {
            this.close();
        }

        event.preventDefault();
    };

    public selectResult = (result: any) => {
        const { values, onChange } = this.props;
        const next = values.slice();
        next.push(result);

        const label = this.getItemLabel(result);
        announce.politely(this.dictionary.valueAdded(label));

        onChange(next);
        return next;
    };

    protected isMaximumNumberOfValuesSelected() {
        const { maxValues, values } = this.props;
        return !!(maxValues && maxValues >= 0 && values && values.length >= maxValues);
    }
}
