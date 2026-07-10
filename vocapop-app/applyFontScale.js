/* 글자 크기 설정 — 모든 <Text>의 fontSize에 전역 배율을 곱한다(파일별 수정 없이).
   Text.render 를 감싸 '입력 props.style'을 스케일한 뒤 원래 렌더로 넘긴다.
   (출력 element는 Context.Provider로 감싸져 style이 안 보이므로 입력을 건드려야 한다.)
   App.js 최상단에서 import './applyFontScale' 한 번만. */
import { Text, StyleSheet } from 'react-native';
import { getFontScale } from './theme';

if (Text.render && !Text.__popvocaScalePatched) {
  Text.__popvocaScalePatched = true;
  const orig = Text.render;
  Text.render = function (props, ref) {
    const scale = getFontScale();
    if (scale !== 1) {
      const flat = StyleSheet.flatten(props.style) || {};
      if (flat.fontSize) {
        props = Object.assign({}, props, {
          style: [props.style, { fontSize: flat.fontSize * scale, ...(flat.lineHeight ? { lineHeight: flat.lineHeight * scale } : null) }],
        });
      }
    }
    return orig.call(this, props, ref);
  };
}
