"""Compile and execute the 32 teaching examples against independent sorted results.

Uses clang, clang++ and an available JDK. A portable JDK can be supplied with
--java-home; compiler binaries and generated executables never enter the site.
"""
import argparse
import json
import random
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = json.loads((ROOT / 'scripts/sorting-examples.json').read_text())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--java-home', type=Path)
    args = parser.parse_args()
    rng = random.Random(526528)
    cases = [[], [1], [0, 0], [-2147483648, 2147483647, 0, -1, 1], list(range(20)), list(range(20, 0, -1)), [7] * 20]
    cases += [[rng.randint(-2147483648, 2147483647) for _ in range(rng.randint(0, 20))] for _ in range(200)]
    payload = '\n'.join(' '.join(map(str, [len(a), *a])) for a in cases) + '\n'
    expected = [' '.join(map(str, [len(a), *sorted(a)])) for a in cases]

    def run(command, data=None):
        result = subprocess.run(list(map(str, command)), input=data, text=True, capture_output=True, check=True, timeout=45)
        return result.stdout

    c_driver = r'''
#include <stdio.h>
#include <inttypes.h>
int main(void) {
    size_t n; int32_t a[20];
    while (scanf("%zu", &n) == 1) {
        if (n > 20) return 2;
        for (size_t i = 0; i < n; ++i) if (scanf("%" SCNd32, &a[i]) != 1) return 3;
        sort_values(a, n); printf("%zu", n);
        for (size_t i = 0; i < n; ++i) printf(" %" PRId32, a[i]);
        putchar('\n');
    }
    return 0;
}
'''
    cpp_driver = r'''
#include <iostream>
int main() {
    std::size_t n;
    while (std::cin >> n) {
        if (n > 20) return 2;
        std::vector<std::int32_t> a(n);
        for (auto& value : a) if (!(std::cin >> value)) return 3;
        sort_values(a); std::cout << n;
        for (auto value : a) std::cout << ' ' << value;
        std::cout << '\n';
    }
}
'''
    with tempfile.TemporaryDirectory(prefix='sorting-code-check-', dir='/private/tmp') as directory:
        folder = Path(directory)
        for name, example in EXAMPLES.items():
            for language, suffix, compiler, standard, driver in [
                ('c', 'c', 'clang', '-std=c11', c_driver), ('cpp', 'cpp', 'clang++', '-std=c++17', cpp_driver)
            ]:
                source = folder / f'{name}.{suffix}'
                source.write_text(example[language] + driver)
                binary = folder / f'{name}-{language}'
                run([compiler, standard, '-Wall', '-Wextra', '-Werror', source, '-o', binary])
                assert run([binary], payload).splitlines() == expected, (name, language)
            namespace = {}
            exec(compile(example['python'], name + '.py', 'exec'), namespace)
            for values in cases:
                copied = values.copy(); namespace['sort_values'](copied)
                assert copied == sorted(values), (name, 'python')
            (folder / f'{name.capitalize()}Sort.java').write_text(example['java'])
        print('C, C++ and Python: 24 examples PASS.', flush=True)
        javac = args.java_home / 'bin/javac' if args.java_home else Path(shutil.which('javac') or 'javac')
        java = args.java_home / 'bin/java' if args.java_home else Path(shutil.which('java') or 'java')
        switches = '\n'.join(f'case "{name}": {name.capitalize()}Sort.sort(a); break;' for name in EXAMPLES)
        (folder / 'CheckSorts.java').write_text('''import java.util.Scanner;
public final class CheckSorts {
  public static void main(String[] args) {
    Scanner in = new Scanner(System.in);
    while (in.hasNextInt()) {
      int n = in.nextInt(); int[] a = new int[n];
      for (int i = 0; i < n; i++) a[i] = in.nextInt();
      switch (args[0]) { ''' + switches + ''' }
      StringBuilder line = new StringBuilder().append(n);
      for (int value : a) line.append(' ').append(value);
      System.out.println(line);
    }
  }
}''')
        run([javac, '--release', '8', *folder.glob('*.java')])
        for name in EXAMPLES:
            assert run([java, '-cp', folder, 'CheckSorts', name], payload).splitlines() == expected, (name, 'java')
        print(f'Java: 8 examples PASS. All 32 examples checked against {len(cases)} cases, including signed 32-bit limits.', flush=True)


if __name__ == '__main__':
    main()
